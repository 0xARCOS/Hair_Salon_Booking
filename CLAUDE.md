# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                # from repo root (npm workspaces + Turborepo)

npm run dev:web            # public site, http://localhost:3000
npm run dev:agenda         # staff agenda PWA

npm run build              # both apps (build:web / build:agenda for one)
npm run lint               # both apps (ESLint via next lint config)
npm run typecheck          # both apps (tsc --noEmit)
```

Each app needs its own `.env.local` (copy from its `.env.example`) with the
Supabase URL and anon key. There is no automated DB tooling: `supabase/schema.sql`
and `supabase/seed.sql` are applied by hand in the Supabase SQL Editor.

## Architecture

Turborepo monorepo with two **independent** Next.js 15 (App Router, React 19,
Tailwind) apps deployed as two separate Netlify sites (each app has its own
`netlify.toml`):

- **`apps/web`** — public marketing/landing site. Prices come from Supabase
  (`services` table, public read). No login and no online booking: clients book
  by phone/WhatsApp only. Keep it free of auth/staff logic.
- **`apps/agenda`** — private staff agenda, installable PWA (manifest.ts +
  `public/sw.js` + install button). Supabase Auth login; any authenticated user
  of the project is staff (no roles table). Appointment calendar, client CRUD,
  manual WhatsApp reminders via `wa.me` links (no paid API). Keep it free of
  public marketing content.
- **`packages/supabase`** (`@salon-app/supabase`) — shared Supabase clients
  (browser/server/middleware) and generated DB types, consumed by both apps.

### Data model (Supabase)

`supabase/schema.sql` defines: `services` (public read), `clients` (staff-managed
contact records — clients never log in, no relation to auth.users),
`appointments` (client_id NOT NULL, created by staff), plus the ficha-sync
tables `client_fichas`, `client_fotos`, `agenda_settings` and a private Storage
bucket `ficha-fotos`. All RLS policies are "authenticated can manage" — the
trust model is "all staff sees everything".

### Local-first fichas + sync (the most stateful subsystem)

`apps/agenda` keeps a rich per-client "ficha" (allergies, preferences, color
formulas, before/after photos as Blobs) in IndexedDB via Dexie
(`apps/agenda/src/lib/local/db.ts`). On top of that:

- **Optional encryption** (`lib/local/crypto.ts`, UI in the Ajustes
  EncryptionPanel): sensitive text fields and photos are AES-GCM encrypted with
  a key derived from a passphrase (PBKDF2, 600k iterations). The key lives only
  in memory during the session; a forgotten passphrase means unrecoverable data.
- **Cross-device sync** (`lib/local/sync.ts` + `src/actions/fichas.ts`):
  offline-first push/pull against `client_fichas`/`client_fotos` and the
  private `ficha-fotos` Storage bucket, last-write-wins by `updated_at`
  (enforced server-side by the `upsert_ficha_if_newer` RPC). Photos are
  soft-deleted so deletions propagate instead of resurrecting.
- **JSON backup export/import** (`lib/local/backup.ts`) from /ajustes;
  encrypted fields travel encrypted.
- Photos are compressed client-side (~1280px JPEG, `lib/local/image.ts`).

Note: `AGENTS.md` predates the sync feature and still claims fichas are "NEVER
synced to Supabase" — that section is outdated; this file and `README.md` are
current.

## Template model

The repo doubles as a template for selling one agenda per salon.
`apps/agenda/src/config/brand.ts` centralizes the brand (name, slug,
description) and feeds the title, PWA manifest, nav, login screen, and WhatsApp
reminder text. `docs/TEMPLATE.md` is the new-client checklist (clone template →
new Supabase project → edit brand.ts → replace icon.svg and regenerate PNGs
with sharp). `.github/workflows/release.yml` publishes install-instruction
Releases on `v*.*.*` tags (PWA — no binary).

## Design

`docs/DESIGN.md` is the visual identity reference (palette "Tocador",
Fraunces + Outfit fonts, arch motif, semantic appointment-status colors).
Derive any new color/typography decision from it.

## History caveat

`docs/archive/agent_instructions_v1/` describes a superseded architecture
(online booking, client accounts, roles, push notifications). Do not follow it.
