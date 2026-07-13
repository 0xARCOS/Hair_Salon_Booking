# Base de datos (Supabase)

## Migraciones

El esquema vive en `migrations/`, en archivos ordenados por fecha (convención
del CLI de Supabase: `YYYYMMDDHHMMSS_nombre.sql`). El antiguo `schema.sql`
monolítico se dividió aquí; **todo cambio de esquema futuro es un archivo
nuevo** en esta carpeta — nunca editar una migración ya aplicada.

- **Proyecto nuevo** (clienta nueva): ejecutar las migraciones en orden en el
  SQL Editor del dashboard, o con el CLI (`supabase link` + `supabase db push`).
- **Proyecto existente**: solo ejecutar las migraciones posteriores a la última
  aplicada. Los proyectos creados con el `schema.sql` anterior ya tienen
  aplicado el contenido de `20260601000000_init.sql` y
  `20260701000000_ficha_sync.sql` **salvo** el parche de seguridad de
  `patches/2026-07-13-revoke-public-execute.sql` (ver esa carpeta).

Después de las migraciones, cargar `seed.sql` (editado con los servicios y
precios reales) y crear las cuentas de staff en Authentication.

## Tests

`tests/upsert_ficha_if_newer.test.sql` se pega completo en el SQL Editor; se
ejecuta dentro de una transacción con ROLLBACK y no deja rastro.

## Copias de seguridad de la base remota

Las fichas locales tienen su propio backup (export JSON desde /ajustes de la
agenda), pero la fuente de verdad de clientas/citas/fichas sincronizadas es
esta base. Qué cubre Supabase según el plan:

- **Plan Free**: **no hay backups automáticos.** La única red de seguridad es
  manual: dashboard → Database → Backups no está disponible; usar
  `pg_dump` (o el botón "Download backup" si el plan lo ofrece) de forma
  periódica, o programarlo (p. ej. GitHub Action con `pg_dump` mensual).
- **Plan Pro**: backups diarios automáticos con 7 días de retención.
- **Point in Time Recovery (PITR)**: addon de pago sobre Pro; permite
  restaurar a cualquier minuto. Recomendable solo si la agenda se vuelve
  crítica para varias clientas.

Recomendación operativa mínima mientras se esté en Free: un `pg_dump` manual
antes de aplicar cualquier migración nueva, y las fotos del bucket
`ficha-fotos` re-sincronizan desde los dispositivos si hiciera falta (cada
dispositivo conserva su copia local en IndexedDB).
