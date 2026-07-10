# Next.js Architecture & Setup

## 1. Project Initialization
Run the following to initialize the project (skip if already done):
```bash
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd web
npx shadcn@latest init -y
```

## 2. Directory Structure Conventions
Inside `src/`:
- `app/`: Contains all route segments.
  - `(auth)/`: Group for login/register pages.
  - `(dashboard)/`: Group for protected client routes.
  - `(admin)/`: Group for protected staff routes.
- `components/`: 
  - `ui/`: shadcn generated components.
  - `shared/`: Reusable components (e.g., Navbar, Footer).
  - `booking/`: Booking wizard components.
- `lib/`:
  - `supabase/`: Supabase client initialization (browser, server, middleware).
  - `utils.ts`: Utility functions (e.g., class merge).
- `actions/`: Next.js Server Actions.
  - `booking.ts`: GCal and Appointment DB logic.

## 3. Tooling
- **Styling**: Tailwind CSS. Do not use plain CSS unless absolutely necessary.
- **Components**: Use `npx shadcn@latest add <component>` for required UI elements (e.g., button, dialog, input, table, calendar).

## 4. Supabase Client Setup
Implement the `@supabase/ssr` package.
```bash
npm install @supabase/supabase-js @supabase/ssr
```
Create the `createBrowserClient`, `createServerClient`, and `createMiddlewareClient` utility functions in `src/lib/supabase/`.
