#!/usr/bin/env bash
# Chequeo de arranque de sesión de Claude Code (hook SessionStart en
# .claude/settings.json). En un clon nuevo de la plantilla avisa de lo que
# falta por preparar; en un repo ya configurado no dice nada.
set -u
cd "$(dirname "$0")/.." || exit 0

warn=""

if [ ! -d node_modules ]; then
  warn+="- Falta \`npm install\` (no hay node_modules).\n"
fi
for app in web agenda; do
  if [ ! -f "apps/$app/.env.local" ]; then
    warn+="- Falta \`apps/$app/.env.local\` (copiar de su .env.example y poner las claves de Supabase).\n"
  fi
done
# En un clon derivado de la plantilla (repo con otro nombre) avisa si la
# marca sigue siendo la original; en el repo base no molesta.
origin="$(git remote get-url origin 2>/dev/null || true)"
if grep -q 'slug: "irene"' apps/agenda/src/config/brand.ts 2>/dev/null \
  && [ -n "$origin" ] && [[ "$origin" != *Hair_Salon_Booking* ]]; then
  warn+="- La marca sigue siendo la de la plantilla: correr \`node scripts/new-client.mjs\` o seguir docs/TEMPLATE.md.\n"
fi

if [ -n "$warn" ]; then
  printf 'Estado del repo al arrancar la sesión (hook SessionStart):\n%b' "$warn"
  printf 'Checklist completo de clienta nueva: docs/TEMPLATE.md\n'
fi
exit 0
