import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

// Las server actions no existen fuera de Next: se sustituyen por un "remoto"
// vacío para que el bootstrap no encuentre nada y todo pase por Dexie local.
vi.mock("@/actions/fichas", () => ({
  pullCryptoSettings: vi.fn(async () => null),
  pushCryptoSettings: vi.fn(async () => {}),
  deleteCryptoSettings: vi.fn(async () => {}),
}));

// crypto.ts usa sync.ts para invalidar las copias remotas al (des)activar;
// aquí solo verificamos que lo pide — la lógica de sync tiene su propio test.
vi.mock("../sync", () => ({
  queueFotoDeletions: vi.fn(async () => {}),
  syncAll: vi.fn(async () => {}),
}));

import { queueFotoDeletions, syncAll } from "../sync";
import {
  enableEncryption,
  disableEncryption,
  isEncryptionEnabled,
  unlock,
  lock,
  getSessionKey,
  encryptFicha,
  decryptFicha,
  encryptBlob,
  decryptBlob,
} from "../crypto";
import { localDB, emptyFicha, type FichaLocal, type FotoLocal } from "../db";

const PASSPHRASE = "frase-de-paso-correcta";

function fichaDePrueba(): FichaLocal {
  return {
    ...emptyFicha("11111111-1111-1111-1111-111111111111"),
    alergias: "PPD — patch test obligatorio",
    preferencias: "Café con leche, sin charla",
    notas: "Notas internas largas con acentos: coloración, día, señal",
    formulas: [
      { id: "f1", fecha: "2026-07-01", titulo: "Balayage", detalle: "7.1 + 20vol 35min" },
    ],
  };
}

beforeAll(async () => {
  await Promise.all([localDB.fichas.clear(), localDB.fotos.clear(), localDB.meta.clear()]);
});

afterAll(async () => {
  await localDB.delete();
});

describe("cifrado de fichas locales", () => {
  it("no está activado en una base vacía", async () => {
    expect(await isEncryptionEnabled()).toBe(false);
    expect(await unlock(PASSPHRASE)).toBe(false); // sin salt no hay nada que desbloquear
  });

  it("enableEncryption cifra las fichas existentes y deja la sesión desbloqueada", async () => {
    // Ficha y foto ya sincronizadas en claro: al activar el cifrado deben
    // quedar pendientes de re-subir para no dejar copias en claro remotas.
    await localDB.fichas.put({ ...fichaDePrueba(), syncedAt: Date.now() });
    await localDB.fotos.add({
      clientId: "11111111-1111-1111-1111-111111111111",
      blob: new Blob([new Uint8Array([1, 2, 3])]),
      caption: "",
      createdAt: 1_000,
      mimeType: "image/jpeg",
      enc: false,
      remoteId: "foto-en-claro",
    } satisfies FotoLocal);

    await enableEncryption(PASSPHRASE);

    expect(await isEncryptionEnabled()).toBe(true);
    expect(getSessionKey()).not.toBeNull();

    const stored = await localDB.fichas.get("11111111-1111-1111-1111-111111111111");
    expect(stored).toBeDefined();
    // Los campos sensibles quedan vacíos en claro y viajan dentro de `enc`.
    expect(stored!.alergias).toBe("");
    expect(stored!.preferencias).toBe("");
    expect(stored!.notas).toBe("");
    expect(stored!.formulas).toEqual([]);
    expect(stored!.enc).toMatch(/^v1:/);
    expect(stored!.enc).not.toContain("PPD");
  });

  it("activar el cifrado invalida las copias remotas subidas en claro", async () => {
    // La ficha vuelve a estar pendiente de push (la remota en claro se pisará).
    const stored = await localDB.fichas.get("11111111-1111-1111-1111-111111111111");
    expect(stored!.syncedAt).toBeUndefined();

    // La foto pierde su remoteId (se re-sube cifrada) y el objeto en claro
    // de Storage queda encolado para borrado.
    const [foto] = await localDB.fotos.toArray();
    expect(foto.enc).toBe(true);
    expect(foto.remoteId).toBeUndefined();
    expect(queueFotoDeletions).toHaveBeenCalledWith([
      { clientId: "11111111-1111-1111-1111-111111111111", remoteId: "foto-en-claro" },
    ]);
    expect(syncAll).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111");
  });

  it("decryptFicha devuelve exactamente los campos originales (round-trip)", async () => {
    const key = getSessionKey()!;
    const original = fichaDePrueba();
    const encrypted = await encryptFicha(original, key);
    const decrypted = await decryptFicha(encrypted, key);
    expect(decrypted.alergias).toBe(original.alergias);
    expect(decrypted.preferencias).toBe(original.preferencias);
    expect(decrypted.notas).toBe(original.notas);
    expect(decrypted.formulas).toEqual(original.formulas);
    expect(decrypted.enc).toBeUndefined();
  });

  it("el mismo texto cifrado dos veces produce payloads distintos (IV aleatorio)", async () => {
    const key = getSessionKey()!;
    const ficha = fichaDePrueba();
    const [a, b] = await Promise.all([encryptFicha(ficha, key), encryptFicha(ficha, key)]);
    expect(a.enc).not.toBe(b.enc);
  });

  it("unlock rechaza una frase incorrecta y no fija clave de sesión", async () => {
    lock();
    expect(getSessionKey()).toBeNull();
    expect(await unlock("frase-equivocada")).toBe(false);
    expect(getSessionKey()).toBeNull();
  });

  it("unlock acepta la frase correcta", async () => {
    expect(await unlock(PASSPHRASE)).toBe(true);
    expect(getSessionKey()).not.toBeNull();
  });

  it("encryptBlob/decryptBlob devuelven los bytes originales byte a byte", async () => {
    const key = getSessionKey()!;
    const bytes = new Uint8Array(4096).map((_, i) => (i * 31 + 7) % 256);
    const original = new Blob([bytes], { type: "image/jpeg" });

    const encrypted = await encryptBlob(key, original);
    // IV de 12 bytes por delante + tag GCM de 16 por detrás.
    expect(encrypted.size).toBe(original.size + 12 + 16);
    expect(encrypted.type).toBe("application/octet-stream");

    const decrypted = await decryptBlob(key, encrypted, "image/jpeg");
    expect(decrypted.type).toBe("image/jpeg");
    expect(new Uint8Array(await decrypted.arrayBuffer())).toEqual(bytes);
  });

  it("decryptBlob falla con una clave que no corresponde", async () => {
    const key = getSessionKey()!;
    const encrypted = await encryptBlob(key, new Blob([new Uint8Array([1, 2, 3])]));

    const wrongKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
      "encrypt",
      "decrypt",
    ]);
    await expect(decryptBlob(wrongKey, encrypted, "image/jpeg")).rejects.toThrow();
  });

  it("disableEncryption descifra las fichas y elimina salt/keyCheck", async () => {
    await expect(disableEncryption("frase-equivocada")).rejects.toThrow(/incorrecta/i);

    await disableEncryption(PASSPHRASE);

    expect(await isEncryptionEnabled()).toBe(false);
    expect(getSessionKey()).toBeNull();

    const stored = await localDB.fichas.get("11111111-1111-1111-1111-111111111111");
    expect(stored!.enc).toBeUndefined();
    expect(stored!.alergias).toBe("PPD — patch test obligatorio");
    expect(stored!.formulas).toHaveLength(1);
    // Simétrico a enable: lo descifrado queda pendiente de re-subir para que
    // la copia remota no se quede cifrada con una clave ya descartada.
    expect(stored!.syncedAt).toBeUndefined();
  });
});
