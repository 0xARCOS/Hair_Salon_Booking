-- Servicios iniciales del Salón Irene Rodríguez (Guadalajara, México).
-- Precios en MXN, orientativos: ajústalos a las tarifas reales del salón
-- desde la agenda o editando este archivo.
-- Ejecuta este seed UNA vez tras aplicar las migraciones de migrations/.

INSERT INTO public.services (name, price, duration_mins, is_multi_session) VALUES
  ('Corte de cabello',        280.00,  45, FALSE),
  ('Color y mechas',          950.00, 120, TRUE),
  ('Balayage',                1300.00, 150, TRUE),
  ('Tratamiento capilar',     500.00,  45, FALSE),
  ('Peinado o recogido',      600.00,  60, FALSE),
  ('Barba y afeitado',        200.00,  30, FALSE),
  ('Estética facial',         420.00,  45, FALSE)
ON CONFLICT DO NOTHING;
