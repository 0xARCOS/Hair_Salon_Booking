-- Test de integración de la RPC upsert_ficha_if_newer (last-write-wins).
--
-- Cómo correrlo: pegar el archivo completo en el SQL Editor de Supabase y
-- ejecutarlo. No deja rastro (todo dentro de una transacción con ROLLBACK).
-- Si alguna aserción falla, el script termina con una EXCEPTION que nombra
-- el caso roto; si termina sin errores, la RPC se comporta como se espera.

BEGIN;

DO $$
DECLARE
    test_client UUID;
    v_notas TEXT;
    v_updated TIMESTAMPTZ;
    t1 TIMESTAMPTZ := '2026-01-01T10:00:00Z';
    t2 TIMESTAMPTZ := '2026-01-01T12:00:00Z';
BEGIN
    INSERT INTO public.clients (full_name, phone)
    VALUES ('__test_rpc__', '0000000000')
    RETURNING id INTO test_client;

    -- 1. Primera subida: inserta la fila.
    PERFORM public.upsert_ficha_if_newer(test_client, '', '', 'v1', '[]'::jsonb, NULL, t1);
    SELECT notas, updated_at INTO v_notas, v_updated FROM public.client_fichas WHERE client_id = test_client;
    IF v_notas IS DISTINCT FROM 'v1' OR v_updated IS DISTINCT FROM t1 THEN
        RAISE EXCEPTION 'Caso 1 roto: el INSERT inicial no escribió la ficha (notas=%, updated_at=%)', v_notas, v_updated;
    END IF;

    -- 2. Una versión más nueva SÍ pisa a la vieja.
    PERFORM public.upsert_ficha_if_newer(test_client, '', '', 'v2', '[]'::jsonb, NULL, t2);
    SELECT notas, updated_at INTO v_notas, v_updated FROM public.client_fichas WHERE client_id = test_client;
    IF v_notas IS DISTINCT FROM 'v2' OR v_updated IS DISTINCT FROM t2 THEN
        RAISE EXCEPTION 'Caso 2 roto: una versión más nueva no aplicó el update (notas=%)', v_notas;
    END IF;

    -- 3. Una versión más VIEJA no pisa a la más nueva (el corazón del LWW).
    PERFORM public.upsert_ficha_if_newer(test_client, '', '', 'v0-vieja', '[]'::jsonb, NULL, t1);
    SELECT notas, updated_at INTO v_notas, v_updated FROM public.client_fichas WHERE client_id = test_client;
    IF v_notas IS DISTINCT FROM 'v2' OR v_updated IS DISTINCT FROM t2 THEN
        RAISE EXCEPTION 'Caso 3 roto: un updated_at más viejo pisó la versión más nueva (notas=%)', v_notas;
    END IF;

    -- 4. El mismo updated_at tampoco pisa (el WHERE usa <, no <=).
    PERFORM public.upsert_ficha_if_newer(test_client, '', '', 'v2-bis', '[]'::jsonb, NULL, t2);
    SELECT notas INTO v_notas FROM public.client_fichas WHERE client_id = test_client;
    IF v_notas IS DISTINCT FROM 'v2' THEN
        RAISE EXCEPTION 'Caso 4 roto: un updated_at idéntico pisó la fila existente (notas=%)', v_notas;
    END IF;

    RAISE NOTICE 'upsert_ficha_if_newer: los 4 casos pasan.';
END;
$$;

ROLLBACK;
