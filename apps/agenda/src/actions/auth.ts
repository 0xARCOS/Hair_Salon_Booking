"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@salon-app/supabase/server";

export type AuthState = { error: string | null };
export type RequestResetState = { error: string | null; sent: boolean };

async function getOrigin() {
  // El Host lo controla quien hace la petición: si está definida, manda la
  // URL canónica del deploy y el header solo queda como fallback de dev.
  // (Supabase además valida redirectTo contra su allowlist de Redirect URLs.)
  const canonical = process.env.NEXT_PUBLIC_SITE_URL;
  if (canonical) return canonical.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/agenda");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordReset(
  _prevState: RequestResetState,
  formData: FormData
): Promise<RequestResetState> {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const origin = await getOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  // Siempre reportamos éxito aunque el email no exista, para no filtrar
  // qué correos están registrados como staff.
  if (error) return { error: error.message, sent: false };
  return { error: null, sent: true };
}

export async function updatePassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/agenda");
}
