# Authentication & Routing

## 1. Authentication Strategy
Use Supabase Auth with standard Email/Password. Magic links can be added later as an enhancement.
- Implement `/login` and `/signup` pages in `src/app/(auth)/`.
- On signup, the Supabase trigger (from `01-Database-Schema.md`) will automatically create the user's Profile.

## 2. Middleware for Protected Routes
Create `src/middleware.ts` to manage route protection and session refresh using `@supabase/ssr`.
- Refresh the auth token on every request.
- **Route Protections**:
  - `/dashboard`: Requires an active session. Redirect to `/login` if not authenticated.
  - `/admin`: Requires an active session AND the user's role in the `profiles` table must be `'staff'`. Redirect to `/dashboard` or `/` if unauthorized.

## 3. Role Checking Helper
Since checking the role requires a database read (unless embedded in Custom JWT claims, which is complex), create a server-side helper function in `src/lib/supabase/queries.ts`:
```typescript
export async function getUserRole(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role;
}
```
Use this in Server Components and Actions to enforce authorization.
