-- Parche de seguridad para proyectos que ya aplicaron schema.sql antes de
-- 2026-07-13. Postgres da EXECUTE a PUBLIC por defecto en toda función nueva;
-- como ambas RPC son SECURITY DEFINER (saltan el RLS), anon podía ejecutarlas
-- con solo la clave pública del proyecto y un UUID válido.
--
-- Ejecutar una vez en el SQL Editor de Supabase. Idempotente.

REVOKE EXECUTE ON FUNCTION public.complete_appointment(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.upsert_ficha_if_newer(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;

-- Higiene estándar de SECURITY DEFINER: fija el search_path.
ALTER FUNCTION public.complete_appointment(UUID) SET search_path = public;
ALTER FUNCTION public.upsert_ficha_if_newer(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ) SET search_path = public;
