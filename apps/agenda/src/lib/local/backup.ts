import { localDB, type FichaLocal } from "./db";
import { encryptFicha, getSessionKey, isEncryptionEnabled } from "./crypto";

// Copia de seguridad de las fichas locales: un único archivo .json con las
// fichas y las fotos en base64. Crítico porque los datos viven solo en este
// navegador — si se borran los datos del sitio o se cambia de equipo, la
// copia es la única forma de recuperarlos.

const BACKUP_VERSION = 2;

interface BackupPhoto {
  clientId: string;
  caption: string;
  createdAt: number;
  type: string; // tipo real del Blob (application/octet-stream si enc)
  dataBase64: string;
  /** Tipo de imagen original — ver FotoLocal.mimeType. Ausente en copias
      antiguas (previas a la sincronización), donde equivale a `type`. */
  mimeType?: string;
  /** Ausente en copias antiguas — nunca hubo fotos cifradas antes. */
  enc?: boolean;
}

interface BackupFile {
  app: "agenda-irene";
  version: number;
  exportedAt: string;
  fichas: FichaLocal[];
  fotos: BackupPhoto[];
  /** v2: si el cifrado está activo, salt y keyCheck viajan con la copia
      para poder restaurarla en otro equipo con la misma frase de paso. */
  crypto?: { salt: string; keyCheck: string };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function exportBackup(): Promise<void> {
  const [fichas, fotos, saltEntry, checkEntry] = await Promise.all([
    localDB.fichas.toArray(),
    localDB.fotos.toArray(),
    localDB.meta.get("cryptoSalt"),
    localDB.meta.get("cryptoKeyCheck"),
  ]);

  const backup: BackupFile = {
    app: "agenda-irene",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    crypto:
      saltEntry && checkEntry
        ? { salt: saltEntry.value, keyCheck: checkEntry.value }
        : undefined,
    fichas,
    fotos: await Promise.all(
      fotos.map(async (f) => ({
        clientId: f.clientId,
        caption: f.caption,
        createdAt: f.createdAt,
        type: f.blob.type || "image/jpeg",
        dataBase64: await blobToBase64(f.blob),
        mimeType: f.mimeType,
        enc: f.enc,
      }))
    ),
  };

  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fichas-irene-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  await localDB.meta.put({ key: "lastBackupAt", value: String(Date.now()) });
}

export interface ImportResult {
  fichas: number;
  fotos: number;
}

/**
 * Restaura una copia. Las fichas del archivo sobrescriben las locales con el
 * mismo clientId; las fotos del archivo se añaden solo si no existe ya una
 * idéntica (mismo clientId + createdAt) para que reimportar no duplique.
 *
 * Reglas de compatibilidad con el cifrado:
 * - Copia cifrada + este equipo sin cifrado → se importa también el salt y
 *   keyCheck: el cifrado queda activado con la frase de paso de la copia.
 * - Copia cifrada + este equipo cifrado con OTRO salt → error (serían
 *   indescifrables); hay que desactivar el cifrado local antes de importar.
 * - Copia sin cifrar + este equipo cifrado → hace falta desbloquear primero;
 *   las fichas se cifran al importarlas.
 */
export async function importBackup(file: File): Promise<ImportResult> {
  const parsed = JSON.parse(await file.text()) as BackupFile;
  if (parsed.app !== "agenda-irene" || !Array.isArray(parsed.fichas)) {
    throw new Error("El archivo no es una copia de seguridad de la agenda.");
  }
  if (parsed.version > BACKUP_VERSION) {
    throw new Error(
      "La copia es de una versión más nueva de la app. Actualiza la app e inténtalo de nuevo."
    );
  }

  const localEnabled = await isEncryptionEnabled();
  const localSalt = localEnabled ? (await localDB.meta.get("cryptoSalt"))?.value : undefined;
  let fichas = parsed.fichas;
  let cryptoMeta: { salt: string; keyCheck: string } | undefined;

  if (parsed.crypto) {
    if (localEnabled && localSalt !== parsed.crypto.salt) {
      throw new Error(
        "La copia está cifrada con otra frase/clave distinta a la de este equipo. Desactiva el cifrado local en Ajustes y vuelve a importar."
      );
    }
    if (!localEnabled) cryptoMeta = parsed.crypto;
  } else if (localEnabled) {
    const key = getSessionKey();
    if (!key) {
      throw new Error(
        "El cifrado está activado pero bloqueado. Desbloquéalo arriba y vuelve a importar."
      );
    }
    // La copia venía en claro: se cifra al entrar para no dejar texto plano.
    fichas = await Promise.all(fichas.map((f) => (f.enc ? f : encryptFicha(f, key))));
  }

  let fotosAdded = 0;
  await localDB.transaction("rw", localDB.fichas, localDB.fotos, localDB.meta, async () => {
    await localDB.fichas.bulkPut(fichas);
    if (cryptoMeta) {
      await localDB.meta.bulkPut([
        { key: "cryptoSalt", value: cryptoMeta.salt },
        { key: "cryptoKeyCheck", value: cryptoMeta.keyCheck },
      ]);
    }
    for (const foto of parsed.fotos ?? []) {
      const exists = await localDB.fotos
        .where("clientId")
        .equals(foto.clientId)
        .and((f) => f.createdAt === foto.createdAt)
        .count();
      if (exists === 0) {
        await localDB.fotos.add({
          clientId: foto.clientId,
          caption: foto.caption,
          createdAt: foto.createdAt,
          blob: base64ToBlob(foto.dataBase64, foto.type),
          mimeType: foto.mimeType ?? foto.type,
          enc: foto.enc ?? false,
        });
        fotosAdded++;
      }
    }
  });

  return { fichas: parsed.fichas.length, fotos: fotosAdded };
}

export async function lastBackupAt(): Promise<number | null> {
  const entry = await localDB.meta.get("lastBackupAt");
  return entry ? Number(entry.value) : null;
}
