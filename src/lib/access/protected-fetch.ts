import { supabase } from "@/integrations/supabase/client";
import { accessHeaders } from "./access-token";

/**
 * Fetches a protected project file. The server checks both the signed-in user (bearer token)
 * and this browser session's project access (quiz + verified email) before returning any bytes.
 */
export async function fetchProtectedFile(url: string): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    headers: { ...accessHeaders(), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}
