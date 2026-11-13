import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { updateProfileSchema, type Profile } from "./profile-schemas";

// Thin server-function wrappers (Lovable hosting); logic lives in profile-ops.server.ts.
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Profile> => {
    const { runGetProfile } = await import("./profile-ops.server");
    return runGetProfile(context.userId);
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateProfileSchema.parse(d))
  .handler(async ({ data, context }): Promise<Profile> => {
    const { runUpdateProfile } = await import("./profile-ops.server");
    return runUpdateProfile(data, context.userId);
  });
