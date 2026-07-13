# Irene Hair Salon Guadalajara

Monorepo con dos aplicaciones Next.js independientes:

- **`apps/web`** — sitio público: precios y servicios (desde Supabase), ubicación,
  reseñas y un CTA para reservar por llamada o WhatsApp. Sin login, sin reserva
  online: las clientas siempre reservan por teléfono.
- **`apps/agenda`** — agenda privada de la dueña/staff (PWA instalable en el
  móvil), protegida con login. Gestión de citas, ficha de clientas y un botón
  de recordatorio manual por WhatsApp (`wa.me`, sin API de pago).

Ambas apps comparten el cliente de Supabase y los tipos de la base de datos
vía `packages/supabase`.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth + Row Level Security)
- Turborepo (workspaces npm)
- Deploy: 2 sitios Netlify separados apuntando a este mismo repo

## Desarrollo local

```bash
npm install

# Copia el .env.example de cada app a .env.local y añade tus claves de Supabase
cp apps/web/.env.example apps/web/.env.local
cp apps/agenda/.env.example apps/agenda/.env.local

npm run dev:web      # http://localhost:3000
npm run dev:agenda   # http://localhost:3000 (puerto distinto si corres ambas a la vez)
```

## Base de datos

1. En el SQL Editor de Supabase, ejecuta `supabase/schema.sql` (crea `services`,
   `clients`, `appointments`, RLS y la función `complete_appointment`).
2. Ejecuta `supabase/seed.sql` para cargar servicios de ejemplo.
3. Crea manualmente en **Authentication** las cuentas del staff que usarán
   `apps/agenda` — no hay auto-registro; cualquier cuenta autenticada de ese
   proyecto Supabase puede administrar la agenda.

## Fichas de cliente locales (por dispositivo)

Además de los datos de contacto en Supabase, `apps/agenda` guarda por cada
clienta una **ficha rica** — alergias/patch-test, preferencias, notas,
fórmulas de color y fotos antes/después — en el propio dispositivo
(IndexedDB vía Dexie, `apps/agenda/src/lib/local/`). Estos datos **no se
suben a Supabase** ni se sincronizan entre equipos: cada profesional mantiene
su base local sin límites de almacenamiento en la nube.

Implicaciones:

- **Copia de seguridad**: desde **Ajustes** se exporta/importa un archivo
  `.json` con todas las fichas y fotos. Si se borran los datos del navegador
  o se cambia de equipo, esa copia es la única forma de recuperarlas; la app
  recuerda exportar si pasa más de un mes.
- **Instalación como app (PWA)**: la agenda es instalable (manifest + service
  worker). En escritorio, botón «Instalar app» en Ajustes o menú del navegador.
- **Fotos**: se comprimen en el cliente (~1280 px, JPEG) antes de guardarse
  como `Blob`.
- **Cifrado opcional** (Ajustes → «Cifrado de las fichas locales»): los campos
  sensibles (alergias, preferencias, notas, fórmulas y fotos — los pies de
  foto no) se
  cifran con AES-GCM y una clave derivada de una frase de paso (PBKDF2,
  600k iteraciones). La clave vive solo en memoria durante la sesión y nunca
  sale del dispositivo; las copias de seguridad exportadas viajan cifradas y
  se restauran en otro equipo con la misma frase. **Si se olvida la frase, los
  datos cifrados y sus copias son irrecuperables.**

La identidad visual de ambas apps está documentada en `docs/DESIGN.md`.

## Notas de contenido pendientes

La landing (`apps/web`) tiene datos de contacto/ubicación con placeholders
marcados `TODO` en `apps/web/src/components/landing/LandingClient.tsx`:
teléfono, dirección, embed de Google Maps y reseñas. Reemplázalos con los
datos reales del salón antes de publicar.

## Build y deploy

```bash
npm run build          # ambas apps
npm run build:web
npm run build:agenda
```

Cada app tiene su propio `netlify.toml` (`base` apuntando a `apps/web` o
`apps/agenda`). En Netlify, crea un sitio por app con ese mismo `Base
directory` y sus propias variables de entorno de Supabase.
