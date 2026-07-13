# Cómo usar este repo como plantilla para una clienta nueva

Este repo empezó como la app de "Irene Hair Salon" pero está pensado para
reusarse: cada clienta nueva es un clon de este repo con un puñado de
archivos editados, no una reescritura desde cero. Checklist, en orden:

## 1. Repo

- **Una sola vez, en este repo base**: Settings → General → activar
  "Template repository". Ya no hace falta repetir este paso.
- **Por cada clienta nueva**: botón "Use this template" en GitHub → crear el
  repo nuevo con el nombre de la clienta.

## 2. Supabase

- Crear un proyecto nuevo en Supabase.
- Aplicar `supabase/schema.sql` en el editor SQL del dashboard (no hay
  carpeta de migraciones; este archivo es la fuente de verdad aplicada a
  mano).
- Editar `supabase/seed.sql` con los servicios y precios reales de la
  clienta, y ejecutarlo.
- Crear la primera cuenta de staff (Authentication → Users).

## 3. Identidad de la agenda (`apps/agenda`)

- Editar `apps/agenda/src/config/brand.ts` (nombre completo, nombre corto,
  slug, descripción). Este único archivo alimenta el `<title>`, el manifest
  de la PWA, el encabezado de navegación, la pantalla de login y el mensaje
  de recordatorio de WhatsApp.
- Reemplazar `apps/agenda/public/icons/icon.svg` por el logo real de la
  clienta, y regenerar los PNG de instalación:
  ```
  node -e "
  const sharp = require('sharp');
  const fs = require('fs');
  const svg = fs.readFileSync('apps/agenda/public/icons/icon.svg');
  Promise.all([192, 512].map(size =>
    sharp(svg, { density: 384 }).resize(size, size).png()
      .toFile(\`apps/agenda/public/icons/icon-\${size}.png\`)
  ));
  "
  cp apps/agenda/public/icons/icon-512.png apps/agenda/src/app/icon.png
  cp apps/agenda/public/icons/icon-192.png apps/agenda/src/app/apple-icon.png
  ```
  (`sharp` no es una dependencia declarada — se usa transitivamente desde
  `node_modules` solo para esta generación puntual de assets).

## 4. Colores de marca

Editar el bloque `:root` en **ambos** archivos (deben quedar iguales):
- `apps/agenda/src/app/globals.css`
- `apps/web/src/app/globals.css`

Formato HSL (`H S% L%`, sin `hsl()` ni comas) — ver `docs/DESIGN.md` para la
paleta de referencia y el proceso de derivar una nueva.

## 5. Contenido de la web pública (`apps/web`)

A diferencia de la agenda, esta es prosa de marketing bespoke por clienta —
no hay config que la abstraiga. Editar directamente:
- `apps/web/src/app/layout.tsx` — `metadata.title`/`description` (marcado con
  `// TODO`).
- `apps/web/src/components/landing/LandingClient.tsx` — todos los bloques
  marcados con `// TODO:` al principio del archivo (teléfono, WhatsApp,
  dirección, fotos, reseñas) y las menciones sueltas de "Irene Rodríguez" en
  el nav, hero, sección "El salón", alt de imágenes, título del mapa y pie de
  página.

## 6. Despliegue (Netlify)

- `netlify.toml` en cada app ya es genérico — no requiere cambios.
- Conectar cada sitio de Netlify (agenda y web) al nuevo repo.
- Configurar las variables de entorno de Supabase (URL + clave pública) por
  app en Netlify.

## 7. Entrega a la clienta (Release de GitHub)

- Configurar la variable de repo `AGENDA_URL` (Settings → Secrets and
  variables → Actions → Variables) con la URL desplegada de la agenda —
  la usa `.github/workflows/release.yml` en las instrucciones del Release.
- Al terminar cada entrega: `git tag vX.Y.Z && git push origin vX.Y.Z`. El
  workflow corre typecheck/lint/build y crea un Release en GitHub con
  instrucciones de instalación en español, listas para reenviar a la
  clienta. **No hay ningún archivo adjunto que descargar** — la app se
  instala directo desde el navegador (PWA), visitando `AGENDA_URL` y usando
  "Instalar aplicación" / "Añadir a pantalla de inicio".

## Notas de diseño

- El scope de paquete interno es `@salon-app/supabase` (no lleva el nombre de
  ninguna clienta) — no hace falta tocarlo nunca al reusar la plantilla.
- `apps/agenda/src/lib/local/crypto.ts` tiene una constante interna
  (`KEY_CHECK_PLAINTEXT`) que **no** depende de la marca — es un valor mágico
  invisible para el usuario, no la edites.
