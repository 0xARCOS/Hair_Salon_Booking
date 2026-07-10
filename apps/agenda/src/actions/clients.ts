"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@irene/supabase/server";

export type ClientFormState = { error: string | null };

export async function createClientRecord(
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado." };

  const full_name = (formData.get("full_name") as string | null)?.trim() ?? "";
  const phone = (formData.get("phone") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() || null;
  const internal_notes = (formData.get("internal_notes") as string | null)?.trim() || null;

  if (!full_name || !phone) {
    return { error: "Nombre y teléfono son obligatorios." };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({ full_name, phone, email, internal_notes })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function updateClientRecord(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autorizado." };

  const full_name = (formData.get("full_name") as string | null)?.trim() ?? "";
  const phone = (formData.get("phone") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() || null;
  const internal_notes = (formData.get("internal_notes") as string | null)?.trim() || null;
  const active_treatment_phase =
    (formData.get("active_treatment_phase") as string | null)?.trim() || null;

  if (!full_name || !phone) {
    return { error: "Nombre y teléfono son obligatorios." };
  }

  const { error } = await supabase
    .from("clients")
    .update({
      full_name,
      phone,
      email,
      internal_notes,
      active_treatment_phase,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);
  if (error) return { error: error.message };

  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/clientes");
  return { error: null };
}
