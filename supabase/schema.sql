-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TYPE user_role AS ENUM ('client', 'staff');

CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role user_role DEFAULT 'client',
    full_name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Services Table
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    duration_mins INT NOT NULL,
    is_multi_session BOOLEAN DEFAULT FALSE
);

-- 3. Appointments Table
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    status appointment_status DEFAULT 'pending',
    gcal_event_id TEXT,
    -- Datos de contacto para reservas sin registro (modelo híbrido)
    guest_name TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Client CRM Table (Flattened)
CREATE TABLE public.client_crm (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    total_spent NUMERIC(10, 2) DEFAULT 0,
    active_treatment_phase TEXT,
    internal_notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Triggers and RPCs
-- Auto-create Profile on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown'), 'client');
  
  INSERT INTO public.client_crm (client_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update CRM on Appointment Completion (RPC)
CREATE OR REPLACE FUNCTION complete_appointment(appointment_id UUID)
RETURNS VOID AS $$
DECLARE
    v_client_id UUID;
    v_price NUMERIC;
BEGIN
    -- Update appointment status
    UPDATE public.appointments SET status = 'completed' WHERE id = appointment_id
    RETURNING client_id, (SELECT price FROM public.services WHERE id = service_id) INTO v_client_id, v_price;

    -- Update CRM total spent
    UPDATE public.client_crm
    SET total_spent = total_spent + v_price, updated_at = NOW()
    WHERE client_id = v_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_crm ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is staff (bypasses RLS to avoid infinite recursion)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff'
  );
$$;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT USING (public.is_staff());
CREATE POLICY "Staff can update all profiles" ON public.profiles FOR UPDATE USING (public.is_staff());

-- Services Policies
CREATE POLICY "Services are viewable by everyone" ON public.services FOR SELECT USING (true);
CREATE POLICY "Staff can insert services" ON public.services FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Staff can update services" ON public.services FOR UPDATE USING (public.is_staff());
CREATE POLICY "Staff can delete services" ON public.services FOR DELETE USING (public.is_staff());

-- Appointments Policies
CREATE POLICY "Users can view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Users can insert own appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Staff can view all appointments" ON public.appointments FOR SELECT USING (public.is_staff());
CREATE POLICY "Staff can update all appointments" ON public.appointments FOR UPDATE USING (public.is_staff());
-- Reservas sin registro: cualquiera puede solicitar una cita de invitado (pendiente)
CREATE POLICY "Anyone can request a guest appointment" ON public.appointments FOR INSERT
  WITH CHECK (
    client_id IS NULL
    AND status = 'pending'
    AND guest_name IS NOT NULL
    AND guest_phone IS NOT NULL
  );

-- Client_CRM Policies
CREATE POLICY "Staff can view all CRM records" ON public.client_crm FOR SELECT USING (public.is_staff());
CREATE POLICY "Staff can update all CRM records" ON public.client_crm FOR UPDATE USING (public.is_staff());
CREATE POLICY "Staff can insert CRM records" ON public.client_crm FOR INSERT WITH CHECK (public.is_staff());
