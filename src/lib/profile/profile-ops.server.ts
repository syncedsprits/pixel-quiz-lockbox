import type { z } from "zod";

import type { Profile, updateProfileSchema } from "./profile-schemas";

/**
 * Editable profile (display name), saved in user_profiles and keyed by the caller's sign-in email,
 * so it is found again after logging out and back in. The email is read on the server from the
 * verified sign-in, never from the request body, so callers can only edit their own profile.
 */
async function callerEmail(userId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error("Please sign in again.");
  const entered = data.user.user_metadata?.["entered_email"];
  const email = (data.user.email || (typeof entered === "string" ? entered : "")).trim().toLowerCase();
  if (!email) throw new Error("Your sign-in has no email address.");
  return email;
}

export async function runGetProfile(userId: string): Promise<Profile> {
  const email = await callerEmail(userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("user_profiles").select("display_name").eq("email", email).maybeSingle();
  if (error) throw new Error("Your profile couldn't be loaded.");
  return { displayName: data?.display_name ?? null };
}

export async function runUpdateProfile(data: z.output<typeof updateProfileSchema>, userId: string): Promise<Profile> {
  const email = await callerEmail(userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert({ email, display_name: data.displayName, updated_by: userId, updated_at: new Date().toISOString() }, { onConflict: "email" })
    .select("display_name")
    .single();
  if (error || !row) throw new Error("Your profile couldn't be saved. Please try again.");
  return { displayName: row.display_name };
}
