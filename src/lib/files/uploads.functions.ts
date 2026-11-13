import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { deleteUploadSchema, listUploadsSchema, type SharedUpload } from "./uploads-schemas";

// Thin server-function wrappers (Lovable hosting); logic lives in uploads-ops.server.ts.
export const listUploads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => listUploadsSchema.parse(d))
  .handler(async ({ data, context }): Promise<SharedUpload[]> => {
    const { runListUploads } = await import("./uploads-ops.server");
    return runListUploads(data, context.userId);
  });

export const deleteUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => deleteUploadSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { runDeleteUpload } = await import("./uploads-ops.server");
    return runDeleteUpload(data, context.userId);
  });
