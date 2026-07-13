import { useEffect, useState, useSyncExternalStore } from "react";
import { localDB, type FichaLocal, type FotoLocal, type FormulaEntry } from "./db";
import { pullCryptoSettings, pushCryptoSettings, deleteCryptoSettings } from "@/actions/fichas";

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

/** Cifra los bytes crudos de un Blob (fotos). Sin pasar por base64 — para no
    inflar ~33% una foto ya comprimida. Formato: IV (12 bytes) || ciphertext. */
export async function encryptBlob(key: CryptoKey, blob: Blob): Promise<Blob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    await blob.arrayBuffer()
  );
  return new Blob([iv, new Uint8Array(cipher)], { type: "application/octet-stream" });
}

/** Inversa de encryptBlob. `mimeType` es el tipo original de la imagen (se
    pierde en el Blob cifrado), necesario para que el resultado renderice. */
export async function decryptBlob(key: CryptoKey, blob: Blob, mimeType: string): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const iv = bytes.slice(0, 12);
  const cipher = bytes.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, cipher as BufferSource);
  return new Blob([plain], { type: mimeType });
}

/* ─── Estado del cifrado ─────────────────────────────────────────────── */

// El bootstrap remoto (salt/keyCheck de otro dispositivo) se dispara una
// sola vez por carga de página, la primera vez que algo pregunta si el
// cifrado está activo — así FichaLocal y EncryptionPanel (que montan en
// paralelo) no disparan el pull dos veces ni se pisan.
let bootstrapped: Promise<void> | null = null;

async function bootstrapFromRemote(): Promise<void> {
  if (await localDB.meta.get(META_SALT)) return; // ya hay datos locales
  const remote = await pullCryptoSettings().catch(() => null);
  if (remote) {
    await localDB.meta.bulkPut([
      { key: META_SALT, value: remote.salt },
      { key: META_CHECK, value: remote.keyCheck },
    ]);
  }
}

export async function isEncryptionEnabled(): Promise<boolean> {
  bootstrapped ??= bootstrapFromRemote();
  await bootstrapped;
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

/** Cifra el blob de una foto; los blobs pesan más que el texto de una
    ficha, así que se procesan en serie en vez de con Promise.all. */
async function encryptFotosSequential(fotos: FotoLocal[], key: CryptoKey): Promise<FotoLocal[]> {
  const out: FotoLocal[] = [];
  for (const f of fotos) {
    out.push({ ...f, blob: await encryptBlob(key, f.blob), enc: true });
  }
  return out;
}

async function decryptFotosSequential(fotos: FotoLocal[], key: CryptoKey): Promise<FotoLocal[]> {
  const out: FotoLocal[] = [];
  for (const f of fotos) {
    out.push({ ...f, blob: await decryptBlob(key, f.blob, f.mimeType), enc: false });
  }
  return out;
}

/** Activa el cifrado: crea salt+keyCheck y cifra todas las fichas y fotos
    existentes. Las fotos ya subidas a Storage en claro requieren
    re-subirse — sync.ts las detecta como pendientes al cambiar `enc`. */
export async function enableEncryption(passphrase: string): Promise<void> {
  if (await isEncryptionEnabled()) throw new Error("El cifrado ya está activado.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(passphrase, salt);
  const keyCheck = await encryptString(key, KEY_CHECK_PLAINTEXT);

  // WebCrypto no puede esperar dentro de una transacción Dexie: se cifra
  // en memoria y se escribe todo junto después.
  const [fichas, fotos] = await Promise.all([localDB.fichas.toArray(), localDB.fotos.toArray()]);
  const encryptedFichas = await Promise.all(
    fichas.filter((f) => !f.enc).map((f) => encryptFicha(f, key))
  );
  const encryptedFotos = await encryptFotosSequential(
    fotos.filter((f) => !f.enc),
    key
  );

  await localDB.transaction("rw", localDB.fichas, localDB.fotos, localDB.meta, async () => {
    await localDB.fichas.bulkPut(encryptedFichas);
    await localDB.fotos.bulkPut(encryptedFotos);
    await localDB.meta.bulkPut([
      { key: META_SALT, value: toB64(salt) },
      { key: META_CHECK, value: keyCheck },
    ]);
  });

  sessionKey = key;
  notify();

  // Best-effort: si falla la sincronización (offline), el salt/keyCheck se
  // quedan solo locales por ahora y este dispositivo sigue funcionando;
  // otro dispositivo simplemente no podrá desbloquear hasta que se reintente.
  await pushCryptoSettings({ salt: toB64(salt), keyCheck }).catch(() => {});
}

/** Desactiva el cifrado: descifra todas las fichas y fotos, elimina salt+keyCheck. */
export async function disableEncryption(passphrase: string): Promise<void> {
  if (!(await unlock(passphrase))) throw new Error("Frase de paso incorrecta.");
  const key = sessionKey!;

  const [fichas, fotos] = await Promise.all([localDB.fichas.toArray(), localDB.fotos.toArray()]);
  const decryptedFichas = await Promise.all(
    fichas.filter((f) => f.enc).map((f) => decryptFicha(f, key))
  );
  const decryptedFotos = await decryptFotosSequential(
    fotos.filter((f) => f.enc),
    key
  );

  await localDB.transaction("rw", localDB.fichas, localDB.fotos, localDB.meta, async () => {
    await localDB.fichas.bulkPut(decryptedFichas);
    await localDB.fotos.bulkPut(decryptedFotos);
    await localDB.meta.bulkDelete([META_SALT, META_CHECK]);
  });

  sessionKey = null;
  notify();

  await deleteCryptoSettings().catch(() => {});
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
