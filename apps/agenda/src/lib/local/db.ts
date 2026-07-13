import Dexie, { type Table } from "dexie";

// Ficha local — datos ricos de cliente que viven SOLO en este dispositivo
// (IndexedDB). Supabase sigue siendo la fuente de verdad para identidad,
// citas y servicios; esto es aditivo y no se sincroniza. Ver docs/DESIGN.md
// y la sección "Fichas locales" del README.

export interface FormulaEntry {
  id: string; // crypto.randomUUID()
  fecha: string; // ISO yyyy-MM-dd
  titulo: string; // ej. "Balayage raíz sombreada"
  detalle: string; // fórmula, productos, tiempos de exposición…
}

export interface FichaLocal {
  clientId: string; // PK — id de la clienta en Supabase
  alergias: string; // alergias y avisos de patch-test
  preferencias: string; // café, revista, no quiere charla…
  notas: string; // notas internas largas
  formulas: FormulaEntry[];
  createdAt: number;
  updatedAt: number;
  /** Si el cifrado está activo: campos sensibles cifrados (AES-GCM, ver
      crypto.ts). Cuando está presente, los campos de texto van vacíos. */
  enc?: string;
  /** Última vez que esta versión (por updatedAt) se subió a Supabase.
      Ausente o < updatedAt = pendiente de subir. Ver lib/local/sync.ts. */
  syncedAt?: number;
}

export interface FotoLocal {
  id?: number; // autoincrement
  clientId: string;
  blob: Blob; // comprimida antes de guardar (ver image.ts); ciphertext si enc
  caption: string;
  createdAt: number;
  /** Tipo original de la imagen (compressImage siempre da 'image/jpeg').
      Necesario para reconstruir el Blob al descifrar, ya que blob.type deja
      de ser fiable una vez cifrado. */
  mimeType: string;
  /** Si true, `blob` son bytes cifrados (ver crypto.ts encryptBlob). */
  enc: boolean;
  /** id de la fila en client_fotos una vez subida. Ausente = pendiente de
      subir. Ver lib/local/sync.ts. */
  remoteId?: string;
}

export interface MetaEntry {
  key: string; // ej. "lastBackupAt"
  value: string;
}

class AgendaLocalDB extends Dexie {
  fichas!: Table<FichaLocal, string>;
  fotos!: Table<FotoLocal, number>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super("agenda-irene-local");
    this.version(1).stores({
      fichas: "clientId, updatedAt",
      fotos: "++id, clientId, createdAt",
      meta: "key",
    });
  }
}

export const localDB = new AgendaLocalDB();

export function emptyFicha(clientId: string): FichaLocal {
  const now = Date.now();
  return {
    clientId,
    alergias: "",
    preferencias: "",
    notas: "",
    formulas: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Espacio usado/disponible en este navegador, si el API está soportado. */
export async function storageEstimate(): Promise<{
  usage: number;
  quota: number;
} | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}
