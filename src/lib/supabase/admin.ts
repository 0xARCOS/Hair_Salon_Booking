import { createClient } from "@supabase/supabase-js";

// Cliente de Supabase con service-role (solo servidor). Salta las políticas
// RLS, por lo que SOLO debe usarse en código de servidor de confianza
// (p. ej. para leer los tokens push del staff al notificar una nueva cita).
// Devuelve null si falta la clave, para degradar con elegancia.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
