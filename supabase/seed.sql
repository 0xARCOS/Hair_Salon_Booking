-- Servicios iniciales del Salón Irene Rodríguez.
-- Precios y duraciones orientativos: ajústalos a las tarifas reales del salón
-- desde el panel de administración o editando este archivo.
-- Ejecuta este seed UNA vez tras aplicar schema.sql.

INSERT INTO public.services (name, price, duration_mins, is_multi_session) VALUES
  ('Corte de cabello',        18.00,  45, FALSE),
  ('Color y mechas',          55.00, 120, TRUE),
  ('Balayage',                75.00, 150, TRUE),
  ('Tratamiento capilar',     30.00,  45, FALSE),
  ('Peinado o recogido',      35.00,  60, FALSE),
  ('Barba y afeitado',        12.00,  30, FALSE),
  ('Estética facial',         25.00,  45, FALSE)
ON CONFLICT DO NOTHING;
