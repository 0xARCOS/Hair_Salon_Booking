"use server";

import { createClient } from "@salon-app/supabase/server";
import type { ClientFicha, ClientFoto, ClientFormulaEntry } from "@salon-app/supabase";

// Espejo remoto de las fichas locales (ver apps/agenda/src/lib/local/db.ts y
// sync.ts). Dexie sigue siendo la fuente de la verdad offline; estas
// acciones son la capa de sincronización con Supabase.

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado.");
  return supabase;
}

export interface FichaPushInput {
  clientId: string;
  alergias: string;
  preferencias: string;
  notas: string;
  formulas: ClientFormulaEntry[];
  enc: string | null;
  updatedAt: number;
}

/** Upsert atómico last-write-wins vía la RPC de schema.sql. */
export async function upsertFichaIfNewer(input: FichaPushInput): Promise<void> {
  const supabase = await requireUser();
  const { error } = await supabase.rpc("upsert_ficha_if_newer", {
    p_client_id: input.clientId,
    p_alergias: input.alergias,
    p_preferencias: input.preferencias,
    p_notas: input.notas,
    p_formulas: input.formulas,
    p_enc: input.enc,
    p_updated_at: new Date(input.updatedAt).toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function pullFicha(clientId: string): Promise<ClientFicha | null> {
  const supabase = await requireUser();
  const { data, error } = await supabase
    .from("client_fichas")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ClientFicha | null) ?? null;
}

export async function pullFotosMeta(clientId: string): Promise<ClientFoto[]> {
  const supabase = await requireUser();
  const { data, error } = await supabase
    .from("client_fotos")
    .select("*")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ClientFoto[]) ?? [];
}

export interface FotoMetaInput {
  id: string;
  clientId: string;
  storagePath: string;
  caption: string;
  enc: boolean;
  mimeType: string;
}

export async function pushFotoMeta(input: FotoMetaInput): Promise<void> {
  const supabase = await requireUser();
  const { error } = await supabase.from("client_fotos").upsert({
    id: input.id,
    client_id: input.clientId,
    storage_path: input.storagePath,
    caption: input.caption,
    enc: input.enc,
    mime_type: input.mimeType,
  });
  if (error) throw new Error(error.message);
}

/** Soft-delete: marca deleted_at para que el pull de otro dispositivo no
    resucite la foto; el objeto de Storage se borra aparte (best-effort). */
export async function deleteFotoRemote(remoteId: string): Promise<void> {
  const supabase = await requireUser();
  const { error } = await supabase
    .from("client_fotos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", remoteId);
  if (error) throw new Error(error.message);
}

export interface CryptoSettings {
  salt: string;
  keyCheck: string;
}

export async function pullCryptoSettings(): Promise<CryptoSettings | null> {
  const supabase = await requireUser();
  const { data, error } = await supabase
    .from("agenda_settings")
    .select("key, value")
    .in("key", ["crypto_salt", "crypto_key_check"]);
  if (error) throw new Error(error.message);
  const salt = data?.find((r) => r.key === "crypto_salt")?.value;
  const keyCheck = data?.find((r) => r.key === "crypto_key_check")?.value;
  if (!salt || !keyCheck) return null;
  return { salt, keyCheck };
}

export async function pushCryptoSettings(settings: CryptoSettings): Promise<void> {
  const supabase = await requireUser();
  const { error } = await supabase.from("agenda_settings").upsert([
    { key: "crypto_salt", value: settings.salt },
    { key: "crypto_key_check", value: settings.keyCheck },
  ]);
  if (error) throw new Error(error.message);
}

/** Al desactivar el cifrado localmente hay que borrar también el salt/keyCheck
    remoto — si no, otro dispositivo (o este mismo tras recargar) haría
    bootstrap de una clave que ya no corresponde a los datos en claro. */
export async function deleteCryptoSettings(): Promise<void> {
  const supabase = await requireUser();
  const { error } = await supabase
    .from("agenda_settings")
    .delete()
    .in("key", ["crypto_salt", "crypto_key_check"]);
  if (error) throw new Error(error.message);
}
