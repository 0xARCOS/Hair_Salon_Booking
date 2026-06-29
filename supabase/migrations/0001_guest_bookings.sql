-- Migración: reservas sin registro (modelo híbrido)
-- Permite que un cliente solicite cita rellenando nombre + teléfono,
-- sin necesidad de crear una cuenta. La cita entra como 'pending' y el
-- salón la confirma desde el panel de administración.

-- 1. Campos de invitado y nota en la tabla de citas
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS guest_name  TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS notes       TEXT;

-- 2. Política RLS: cualquiera (incluido el rol anónimo) puede SOLICITAR
--    una cita de invitado, siempre como 'pending' y sin vincular cliente.
DROP POLICY IF EXISTS "Anyone can request a guest appointment" ON public.appointments;
CREATE POLICY "Anyone can request a guest appointment"
  ON public.appointments
  FOR INSERT
  WITH CHECK (
    client_id IS NULL
    AND status = 'pending'
    AND guest_name IS NOT NULL
    AND guest_phone IS NOT NULL
  );
