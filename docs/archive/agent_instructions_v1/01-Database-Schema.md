# Database Schema & Security (Supabase)

## 1. Tables and Relationships
The database uses a flattened schema to reduce query complexity and improve performance.

```sql
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
```

## 2. Triggers and RPCs
### Auto-create Profile on Auth Signup
```sql
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
```

### Update CRM on Appointment Completion (RPC)
```sql
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
```

## 3. Row Level Security (RLS) Policies
- **Profiles**: Clients can read/update their own profile. Staff can read all.
- **Services**: Public read access. Staff can insert/update/delete.
- **Appointments**: Clients can read their own, insert their own. Staff can read/update all.
- **Client_CRM**: Staff can read/update all. Clients cannot access.

*Agent Instruction*: Generate the exact RLS SQL policies based on the rules above and apply them via Supabase SQL Editor or migrations.
