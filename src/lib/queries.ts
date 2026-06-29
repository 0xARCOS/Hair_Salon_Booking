import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/types/database";

export async function getUserRole(
  supabase: SupabaseClient
): Promise<UserRole | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return (profile?.role as UserRole) ?? null;
}
