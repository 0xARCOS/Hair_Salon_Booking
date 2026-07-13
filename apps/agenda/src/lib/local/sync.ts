import { createClient } from "@salon-app/supabase/browser";
import {
  upsertFichaIfNewer,
  pullFicha,
  pullFotosMeta,
  pushFotoMeta,
  deleteFotoRemote,
} from "@/actions/fichas";
import { localDB, type FichaLocal, type FotoLocal } from "./db";

// Orquestación offline-first entre Dexie (caché local, ver db.ts) y
// Supabase (client_fichas / client_fotos / Storage, ver actions/fichas.ts).
// Se dispara desde FichaLocal.tsx: al montar la página, tras cada guardado
// (debounced) y en el evento `online`. Todo es best-effort — si falla por
// estar offline, queda pendiente para el siguiente barrido.

const BUCKET = "ficha-fotos";
const PENDING_DELETES_KEY = "pendingFotoDeletes";

const supabase = createClient();

function fotoPath(clientId: string, remoteId: string): string {
  return `${clientId}/${remoteId}.bin`;
}

/* ─── Ficha de texto ─────────────────────────────────────────────────── */

function isFichaPending(ficha: FichaLocal): boolean {
  return !ficha.syncedAt || ficha.syncedAt < ficha.updatedAt;
}

export async function syncFichaPush(clientId: string): Promise<void> {
  const local = await localDB.fichas.get(clientId);
  if (!local || !isFichaPending(local)) return;
  await upsertFichaIfNewer({
    clientId: local.clientId,
    alergias: local.alergias,
    preferencias: local.preferencias,
    notas: local.notas,
    formulas: local.formulas,
    enc: local.enc ?? null,
    updatedAt: local.updatedAt,
  });
  // Vuelve a leer: save() pudo escribir una versión más nueva mientras
  // subíamos esta; solo marcamos synced si sigue siendo la misma versión.
  const current = await localDB.fichas.get(clientId);
  if (current && current.updatedAt === local.updatedAt) {
    await localDB.fichas.update(clientId, { syncedAt: Date.now() });
  }
}

export async function syncFichaPull(clientId: string): Promise<void> {
  const [remote, local] = await Promise.all([pullFicha(clientId), localDB.fichas.get(clientId)]);
  if (!remote) return;
  const remoteUpdatedAt = new Date(remote.updated_at).getTime();
  if (local && local.updatedAt >= remoteUpdatedAt) return; // local es igual o más nuevo

  await localDB.fichas.put({
    clientId: remote.client_id,
    alergias: remote.alergias,
    preferencias: remote.preferencias,
    notas: remote.notas,
    formulas: remote.formulas,
    enc: remote.enc ?? undefined,
    createdAt: local?.createdAt ?? new Date(remote.created_at).getTime(),
    updatedAt: remoteUpdatedAt,
    syncedAt: Date.now(),
  });
}

/* ─── Fotos ──────────────────────────────────────────────────────────── */

async function pendingFotoDeletes(): Promise<{ clientId: string; remoteId: string }[]> {
  const entry = await localDB.meta.get(PENDING_DELETES_KEY);
  return entry ? (JSON.parse(entry.value) as { clientId: string; remoteId: string }[]) : [];
}

async function setPendingFotoDeletes(list: { clientId: string; remoteId: string }[]): Promise<void> {
  if (list.length === 0) {
    await localDB.meta.delete(PENDING_DELETES_KEY);
  } else {
    await localDB.meta.put({ key: PENDING_DELETES_KEY, value: JSON.stringify(list) });
  }
}

async function removeFromStorageAndRemote(clientId: string, remoteId: string): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([fotoPath(clientId, remoteId)]);
  if (storageError) throw storageError;
  await deleteFotoRemote(remoteId);
}

/** Llamado desde FichaLocal.tsx al borrar una foto que ya tenía remoteId.
    Si falla (offline), queda en cola para el siguiente barrido. */
export async function requestFotoDeletion(clientId: string, remoteId: string): Promise<void> {
  try {
    await removeFromStorageAndRemote(clientId, remoteId);
  } catch {
    const pending = await pendingFotoDeletes();
    if (!pending.some((p) => p.remoteId === remoteId)) {
      pending.push({ clientId, remoteId });
      await setPendingFotoDeletes(pending);
    }
  }
}

async function flushPendingFotoDeletes(clientId: string): Promise<void> {
  const pending = await pendingFotoDeletes();
  const mine = pending.filter((p) => p.clientId === clientId);
  if (mine.length === 0) return;
  const remaining: { clientId: string; remoteId: string }[] = pending.filter(
    (p) => p.clientId !== clientId
  );
  for (const { remoteId } of mine) {
    try {
      await removeFromStorageAndRemote(clientId, remoteId);
    } catch {
      remaining.push({ clientId, remoteId });
    }
  }
  await setPendingFotoDeletes(remaining);
}

async function pushPendingFotos(clientId: string): Promise<void> {
  const pending = await localDB.fotos
    .where("clientId")
    .equals(clientId)
    .filter((f) => !f.remoteId)
    .toArray();

  for (const foto of pending) {
    const remoteId = crypto.randomUUID();
    const path = fotoPath(clientId, remoteId);
    const contentType = foto.enc ? "application/octet-stream" : foto.mimeType;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, foto.blob, { contentType });
    if (uploadError) continue; // se reintenta en el siguiente barrido

    try {
      await pushFotoMeta({
        id: remoteId,
        clientId,
        storagePath: path,
        caption: foto.caption,
        enc: foto.enc,
        mimeType: foto.mimeType,
      });
    } catch {
      continue; // objeto subido pero fila de metadatos falló: se reintenta
    }
    await localDB.fotos.update(foto.id!, { remoteId });
  }
}

async function pullMissingFotos(clientId: string): Promise<void> {
  const [remoteFotos, localFotos] = await Promise.all([
    pullFotosMeta(clientId),
    localDB.fotos.where("clientId").equals(clientId).toArray(),
  ]);

  const localByRemoteId = new Map(
    localFotos.filter((f): f is FotoLocal & { remoteId: string } => !!f.remoteId).map((f) => [f.remoteId, f])
  );

  for (const rf of remoteFotos) {
    if (localByRemoteId.has(rf.id)) continue;
    const { data, error } = await supabase.storage.from(BUCKET).download(rf.storage_path);
    if (error || !data) continue;
    await localDB.fotos.add({
      clientId,
      blob: data,
      caption: rf.caption,
      createdAt: new Date(rf.created_at).getTime(),
      mimeType: rf.mime_type,
      enc: rf.enc,
      remoteId: rf.id,
    });
  }

  // Borradas en otro dispositivo (deleted_at) — pullFotosMeta ya las excluye,
  // así que lo que falte aquí respecto a lo local hay que borrarlo local.
  const remoteIds = new Set(remoteFotos.map((f) => f.id));
  for (const lf of localFotos) {
    if (lf.remoteId && !remoteIds.has(lf.remoteId)) {
      await localDB.fotos.delete(lf.id!);
    }
  }
}

export async function syncFotosSweep(clientId: string): Promise<void> {
  await flushPendingFotoDeletes(clientId);
  await pushPendingFotos(clientId);
}

export async function syncFotosPull(clientId: string): Promise<void> {
  await pullMissingFotos(clientId);
}

/* ─── Orquestador ────────────────────────────────────────────────────── */

const inFlight = new Map<string, Promise<void>>();

/** Pull primero (para no pisar ediciones locales sin subir todavía — el
    pull ya comprueba updatedAt y no sobreescribe si local es más nuevo),
    luego push de lo pendiente. Un guard por clientId evita que el mount y
    el evento `online` disparen barridos superpuestos. */
export function syncAll(clientId: string): Promise<void> {
  const existing = inFlight.get(clientId);
  if (existing) return existing;

  // Best-effort: cada paso se aísla para que, p. ej., un fallo de red al
  // subir fotos no impida que la ficha de texto sí llegue a sincronizarse.
  const step = (fn: () => Promise<void>) => fn().catch(() => {});

  const run = (async () => {
    try {
      await step(() => syncFichaPull(clientId));
      await step(() => syncFichaPush(clientId));
      await step(() => syncFotosPull(clientId));
      await step(() => syncFotosSweep(clientId));
    } finally {
      inFlight.delete(clientId);
    }
  })();

  inFlight.set(clientId, run);
  return run;
}
