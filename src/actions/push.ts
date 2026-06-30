"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/queries";

export async function savePushToken(token: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Only allow staff to save tokens (since it's for them)
  const role = await getUserRole(supabase);
  if (role !== "staff") {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("push_tokens")
    .upsert({ user_id: user.id, fcm_token: token }, { onConflict: "fcm_token" });

  if (error) {
    console.error("Error saving push token:", error);
    return { error: error.message };
  }

  return { success: true };
}
