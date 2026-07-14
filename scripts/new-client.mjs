#!/usr/bin/env node
// Automatiza los pasos mecánicos de docs/TEMPLATE.md al preparar el repo de
// una clienta nueva: reescribe apps/agenda/src/config/brand.ts y regenera
// los PNG de instalación a partir de apps/agenda/public/icons/icon.svg
// (reemplaza antes ese SVG por el logo real si lo tienes).
//
// Uso interactivo:   node scripts/new-client.mjs
// Uso con flags:     node scripts/new-client.mjs --full-name "Salón X" \
//                      --short-name "X" --slug "salon-x" \
//                      --description "Agenda privada de citas." [--skip-icons]
//
// Lo que NO automatiza (ver docs/TEMPLATE.md): colores de marca en los
// globals.css, contenido de la web pública, Supabase y Netlify.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND_FILE = path.join(root, "apps/agenda/src/config/brand.ts");
const ICON_SVG = path.join(root, "apps/agenda/public/icons/icon.svg");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--skip-icons") args.skipIcons = true;
    else if (argv[i].startsWith("--")) args[argv[i].slice(2)] = argv[++i];
  }
  return args;
}

async function ask(rl, label, fallback, validate = () => null) {
  for (;;) {
    const raw = (await rl.question(`${label}${fallback ? ` [${fallback}]` : ""}: `)).trim();
    const value = raw || fallback || "";
    const error = value ? validate(value) : "Este campo es obligatorio.";
    if (!error) return value;
    console.error(`  ✗ ${error}`);
  }
}

const validateSlug = (s) =>
  /^[a-z0-9][a-z0-9-]*$/.test(s)
    ? null
    : "El slug solo puede llevar minúsculas, dígitos y guiones (nombra la IndexedDB y los backups).";

const args = parseArgs(process.argv.slice(2));
let { "full-name": fullName, "short-name": shortName, slug, description } = args;

if (!fullName || !shortName || !slug) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log("Datos de la clienta nueva (enter acepta el valor entre corchetes):\n");
  fullName = fullName ?? (await ask(rl, "Nombre completo del salón"));
  shortName = shortName ?? (await ask(rl, "Nombre corto (encabezados)", fullName.split(" ")[0]));
  slug =
    slug ??
    (await ask(
      rl,
      "Slug interno",
      shortName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      validateSlug
    ));
  description = description ?? (await ask(rl, "Descripción", "Agenda privada de citas y fichas de clientas."));
  rl.close();
} else {
  description = description ?? "Agenda privada de citas y fichas de clientas.";
  const slugError = validateSlug(slug);
  if (slugError) {
    console.error(`--slug inválido: ${slugError}`);
    process.exit(1);
  }
}

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
writeFileSync(
  BRAND_FILE,
  `// Identidad de esta instancia de la app. Al reusar esta plantilla para una
// clienta nueva: correr scripts/new-client.mjs (o editar a mano estos valores
// + el logo en public/icons/icon.svg — ver docs/TEMPLATE.md).
export const brand = {
  fullName: "${esc(fullName)}",
  shortName: "${esc(shortName)}",
  // Identificadores internos: nombre de la IndexedDB local y prefijo de los
  // archivos de copia de seguridad. No es user-facing salvo por el nombre de
  // archivo que se descarga al exportar un backup.
  slug: "${esc(slug)}",
  description: "${esc(description)}",
};
`
);
console.log(`✓ ${path.relative(root, BRAND_FILE)} reescrito para "${fullName}".`);

if (args.skipIcons) {
  console.log("· Iconos omitidos (--skip-icons).");
} else if (!existsSync(ICON_SVG)) {
  console.error(`✗ No existe ${path.relative(root, ICON_SVG)} — coloca el logo y vuelve a correr.`);
  process.exit(1);
} else {
  // sharp no es dependencia declarada: llega transitivamente (Next lo trae).
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("✗ No se pudo cargar `sharp` — ¿corriste `npm install`? Iconos sin regenerar.");
    process.exit(1);
  }
  const svg = readFileSync(ICON_SVG);
  const iconsDir = path.join(root, "apps/agenda/public/icons");
  await Promise.all(
    [192, 512].map((size) =>
      sharp(svg, { density: 384 }).resize(size, size).png().toFile(path.join(iconsDir, `icon-${size}.png`))
    )
  );
  copyFileSync(path.join(iconsDir, "icon-512.png"), path.join(root, "apps/agenda/src/app/icon.png"));
  copyFileSync(path.join(iconsDir, "icon-192.png"), path.join(root, "apps/agenda/src/app/apple-icon.png"));
  copyFileSync(path.join(iconsDir, "icon-512.png"), path.join(root, "apps/web/src/app/icon.png"));
  copyFileSync(path.join(iconsDir, "icon-192.png"), path.join(root, "apps/web/src/app/apple-icon.png"));
  console.log("✓ Iconos regenerados (agenda PWA 192/512 + favicons de agenda y web).");
}

console.log(`
Pasos que siguen siendo manuales (docs/TEMPLATE.md):
  1. Colores de marca en apps/{agenda,web}/src/app/globals.css (bloques :root iguales).
  2. Contenido real de la web pública (TODOs en LandingClient.tsx y layout.tsx).
  3. Proyecto Supabase nuevo: migraciones de supabase/migrations/ + seed.sql editado.
  4. Netlify: dos sitios nuevos + variables de entorno.
  5. Variable de repo AGENDA_URL para los Releases.`);
