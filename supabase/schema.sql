-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Services table — leída sin login por la web pública (listado de precios)
--    y gestionada desde la agenda privada.
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    price NUMERIC(10, 2) NOT NULL,
    duration_mins INT NOT NULL,
    is_multi_session BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Clients table — ficha de clienta gestionada 100% por staff desde la
--    agenda. No tiene relación con auth.users: las clientas no inician
--    sesión, reservan solo por llamada/WhatsApp.
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    internal_notes TEXT,
    active_treatment_phase TEXT,
    total_spent NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Appointments table — creadas manualmente por staff desde la agenda
--    tras la llamada telefónica. Toda cita requiere una ficha de cliente.
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    status appointment_status DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RPC: marcar cita completada y sumar el precio del servicio al total
--    gastado por la clienta.
CREATE OR REPLACE FUNCTION public.complete_appointment(appointment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_client_id UUID;
    v_price NUMERIC;
BEGIN
    UPDATE public.appointments SET status = 'completed' WHERE id = appointment_id
    RETURNING client_id, (SELECT price FROM public.services WHERE id = service_id) INTO v_client_id, v_price;

    UPDATE public.clients
    SET total_spent = total_spent + COALESCE(v_price, 0), updated_at = NOW()
    WHERE id = v_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Row Level Security
--    No hay tabla de roles: cualquier cuenta de auth.users es staff de la
--    agenda (las clientas no tienen cuenta). services.SELECT es la única
--    lectura pública, para que la web sin login liste precios.
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view services" ON public.services
  FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage services" ON public.services
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can manage clients" ON public.clients
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can manage appointments" ON public.appointments
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 6. Grants — RLS solo filtra filas; sin estos GRANT, PostgREST devuelve
--    "permission denied" aunque la política lo permita.
GRANT SELECT ON public.services TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_appointment(UUID) TO authenticated;
