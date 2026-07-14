-- 7. Fichas locales sincronizadas — antes vivían solo en IndexedDB de cada
--    dispositivo (ver apps/agenda/src/lib/local/db.ts). Estas tablas son el
--    espejo remoto para que el mismo staff vea la misma ficha desde
--    cualquier dispositivo; Dexie sigue siendo la caché local/offline.
CREATE TABLE public.client_fichas (
    client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
    alergias TEXT NOT NULL DEFAULT '',
    preferencias TEXT NOT NULL DEFAULT '',
    notas TEXT NOT NULL DEFAULT '',
    formulas JSONB NOT NULL DEFAULT '[]'::jsonb,
    enc TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- id lo genera el cliente (crypto.randomUUID()) porque también nombra el
-- objeto en Storage antes de conocer la fila de metadatos.
CREATE TABLE public.client_fotos (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    enc BOOLEAN NOT NULL DEFAULT FALSE,
    mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Ajustes globales de la agenda; hoy solo el salt/keyCheck del cifrado
-- opcional de fichas locales (ver crypto.ts), para que un segundo
-- dispositivo pueda desbloquear con la misma frase de paso sin necesitar
-- un backup manual.
CREATE TABLE public.agenda_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- RPC atómica: aplica el upsert solo si la fila entrante es más reciente
-- (last-write-wins por updated_at). ON CONFLICT ... DO UPDATE ... WHERE es
-- atómico — evita la carrera de un SELECT-then-branch entre dos
-- dispositivos guardando casi a la vez.
CREATE OR REPLACE FUNCTION public.upsert_ficha_if_newer(
    p_client_id UUID,
    p_alergias TEXT,
    p_preferencias TEXT,
    p_notas TEXT,
    p_formulas JSONB,
    p_enc TEXT,
    p_updated_at TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.client_fichas (client_id, alergias, preferencias, notas, formulas, enc, updated_at)
    VALUES (p_client_id, p_alergias, p_preferencias, p_notas, p_formulas, p_enc, p_updated_at)
    ON CONFLICT (client_id) DO UPDATE SET
        alergias = EXCLUDED.alergias,
        preferencias = EXCLUDED.preferencias,
        notas = EXCLUDED.notas,
        formulas = EXCLUDED.formulas,
        enc = EXCLUDED.enc,
        updated_at = EXCLUDED.updated_at
    WHERE public.client_fichas.updated_at < EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Igual que complete_appointment: sin este REVOKE, anon podría ejecutar la
-- RPC (EXECUTE a PUBLIC por defecto) y, siendo SECURITY DEFINER, escribir
-- fichas saltándose el RLS con solo conocer un client_id.
REVOKE EXECUTE ON FUNCTION public.upsert_ficha_if_newer(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;

-- Bucket privado para las fotos de ficha. Nunca se sirve con getPublicUrl:
-- siempre se sube/baja con el cliente autenticado y se cachea localmente.
INSERT INTO storage.buckets (id, name, public) VALUES ('ficha-fotos', 'ficha-fotos', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.client_fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage client fichas" ON public.client_fichas
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage client fotos" ON public.client_fotos
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage agenda settings" ON public.agenda_settings
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can manage ficha fotos" ON storage.objects
  FOR ALL USING (bucket_id = 'ficha-fotos' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'ficha-fotos' AND auth.role() = 'authenticated');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_fichas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_fotos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_settings TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_ficha_if_newer(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TIMESTAMPTZ) TO authenticated;
