Agent Context File: Irene Hair Salon Guadalajara

[SYSTEM_OBJECTIVE]
Monorepo (Turborepo, npm workspaces) with two independent Next.js apps:
- apps/web: public marketing site (pricing from Supabase, location, reviews,
  call-to-book CTA). No login, no online booking — clients always book by
  phone call or WhatsApp.
- apps/agenda: private staff-only agenda (installable PWA), protected by
  Supabase Auth login. Appointment calendar, client records ("ficha"), and a
  manual WhatsApp reminder button (wa.me link, no paid API).

Shared Supabase client + DB types live in packages/supabase, consumed by both
apps via the workspace package "@irene/supabase".

[TECH_STACK]
- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, Row Level Security)
- Turborepo

[DATA MODEL]
supabase/schema.sql defines three tables: services (public read), clients
(staff-managed contact record, no auth.users relation — clients never log in),
and appointments (client_id NOT NULL, created manually by staff after a phone
call). Any authenticated Supabase user is staff — there is no roles table.

Additionally, apps/agenda keeps a rich local-first "ficha" per client
(allergies, preferences, color formulas, before/after photos as Blobs) in
IndexedDB via Dexie (apps/agenda/src/lib/local/). It is keyed by the Supabase
client id but NEVER synced to Supabase — each device holds its own copies, and
staff export/import JSON backups from /ajustes. Do not move this data to
Supabase; keeping it local is a deliberate storage/cost decision.

[DESIGN]
docs/DESIGN.md is the visual identity reference (palette "Tocador", Fraunces +
Outfit, arch motif, semantic appointment-status colors). Derive any new color
or type decision from it.

[HISTORY]
The project originally shipped as a single Next.js app with full online
booking (client accounts, guest booking, admin panel). That architecture was
replaced with the current call-only booking model; the original agent
instructions for that version are archived at
docs/archive/agent_instructions_v1/ for reference only — do not follow them,
they describe a superseded design (client self-service dashboard, guest
booking RLS, roles table, Google Calendar sync, FCM push notifications — none
of which exist in the current codebase).

[WORKING IN THIS REPO]
- Read README.md for setup and deploy instructions.
- Each app (apps/web, apps/agenda) has its own package.json, tsconfig.json,
  and netlify.toml. Run `npm run build:web` / `npm run build:agenda` (or
  `npm run build` for both) from the repo root.
- Keep apps/web free of auth/staff logic and apps/agenda free of public
  marketing content — that separation is the point of the split.
