import { useEffect, useState, useSyncExternalStore } from "react";
import { localDB, type FichaLocal, type FormulaEntry } from "./db";

// Cifrado opcional de los campos sensibles de las fichas locales
// (alergias, preferencias, notas y fórmulas — las fotos NO se cifran).
//
// - AES-GCM 256 con clave derivada de una frase de paso vía PBKDF2
//   (600k iteraciones, SHA-256). La clave vive solo en memoria mientras
//   dura la sesión: nunca se persiste ni sale del dispositivo.
// - En `meta` se guardan el salt y un valor de verificación (keyCheck)
//   para poder comprobar la frase sin conocerla. Ambos viajan en las
//   copias de seguridad para poder restaurarlas en otro equipo.
// - Si se olvida la frase, los datos cifrados (y sus copias) son
//   irrecuperables por diseño.

const PBKDF2_ITERATIONS = 600_000;
const KEY_CHECK_PLAINTEXT = "agenda-irene-check";
const META_SALT = "cryptoSalt";
const META_CHECK = "cryptoKeyCheck";

/* ─── Clave de sesión (en memoria) ───────────────────────────────────── */

let sessionKey: CryptoKey | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeCrypto(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getSessionKey(): CryptoKey | null {
  return sessionKey;
}

export function lock(): void {
  sessionKey = null;
  notify();
}

/* ─── Primitivas ─────────────────────────────────────────────────────── */

function toB64(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptString(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return `v1:${toB64(iv)}:${toB64(new Uint8Array(cipher))}`;
}

async function decryptString(key: CryptoKey, payload: string): Promise<string> {
  const [version, ivB64, cipherB64] = payload.split(":");
  if (version !== "v1") throw new Error("Formato de cifrado desconocido");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivB64) as BufferSource },
    key,
    fromB64(cipherB64) as BufferSource
  );
  return new TextDecoder().decode(plain);
}

/* ─── Estado del cifrado ─────────────────────────────────────────────── */

export async function isEncryptionEnabled(): Promise<boolean> {
  return (await localDB.meta.get(META_SALT)) !== undefined;
}

/** Deriva la clave y la valida contra keyCheck. Devuelve false si la frase no es correcta. */
export async function unlock(passphrase: string): Promise<boolean> {
  const [saltEntry, checkEntry] = await Promise.all([
    localDB.meta.get(META_SALT),
    localDB.meta.get(META_CHECK),
  ]);
  if (!saltEntry || !checkEntry) return false;
  const key = await deriveKey(passphrase, fromB64(saltEntry.value));
  try {
    if ((await decryptString(key, checkEntry.value)) !== KEY_CHECK_PLAINTEXT) return false;
  } catch {
    return false;
  }
  sessionKey = key;
  notify();
  return true;
}

/* ─── Cifrado de fichas ──────────────────────────────────────────────── */

interface SensitiveFields {
  alergias: string;
  preferencias: string;
  notas: string;
  formulas: FormulaEntry[];
}

export async function encryptFicha(ficha: FichaLocal, key: CryptoKey): Promise<FichaLocal> {
  const sensitive: SensitiveFields = {
    alergias: ficha.alergias,
    preferencias: ficha.preferencias,
    notas: ficha.notas,
    formulas: ficha.formulas,
  };
  return {
    ...ficha,
    alergias: "",
    preferencias: "",
    notas: "",
    formulas: [],
    enc: await encryptString(key, JSON.stringify(sensitive)),
  };
}

export async function decryptFicha(ficha: FichaLocal, key: CryptoKey): Promise<FichaLocal> {
  if (!ficha.enc) return ficha;
  const sensitive = JSON.parse(await decryptString(key, ficha.enc)) as SensitiveFields;
  return { ...ficha, ...sensitive, enc: undefined };
}

/* ─── Activar / desactivar ───────────────────────────────────────────── */

/** Activa el cifrado: crea salt+keyCheck y cifra todas las fichas existentes. */
export async function enableEncryption(passphrase: string): Promise<void> {
  if (await isEncryptionEnabled()) throw new Error("El cifrado ya está activado.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  const keyCheck = await encryptString(key, KEY_CHECK_PLAINTEXT);

  // WebCrypto no puede esperar dentro de una transacción Dexie: se cifra
  // en memoria y se escribe todo junto después.
  const fichas = await localDB.fichas.toArray();
  const encrypted = await Promise.all(
    fichas.filter((f) => !f.enc).map((f) => encryptFicha(f, key))
  );

  await localDB.transaction("rw", localDB.fichas, localDB.meta, async () => {
    await localDB.fichas.bulkPut(encrypted);
    await localDB.meta.bulkPut([
      { key: META_SALT, value: toB64(salt) },
      { key: META_CHECK, value: keyCheck },
    ]);
  });

  sessionKey = key;
  notify();
}

/** Desactiva el cifrado: descifra todas las fichas y elimina salt+keyCheck. */
export async function disableEncryption(passphrase: string): Promise<void> {
  if (!(await unlock(passphrase))) throw new Error("Frase de paso incorrecta.");
  const key = sessionKey!;

  const fichas = await localDB.fichas.toArray();
  const decrypted = await Promise.all(
    fichas.filter((f) => f.enc).map((f) => decryptFicha(f, key))
  );

  await localDB.transaction("rw", localDB.fichas, localDB.meta, async () => {
    await localDB.fichas.bulkPut(decrypted);
    await localDB.meta.bulkDelete([META_SALT, META_CHECK]);
  });

  sessionKey = null;
  notify();
}

/* ─── Hook de estado para componentes ────────────────────────────────── */

export function useEncryptionState(): {
  enabled: boolean | null; // null mientras se carga
  key: CryptoKey | null;
} {
  const key = useSyncExternalStore(
    subscribeCrypto,
    getSessionKey,
    () => null
  );
  const [enabled, setEnabled] = useState<boolean | null>(null);

  // Se recomprueba cuando cambia la clave (activar/desactivar la notifican).
  useEffect(() => {
    let cancelled = false;
    isEncryptionEnabled().then((v) => {
      if (!cancelled) setEnabled(v);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { enabled, key };
}
