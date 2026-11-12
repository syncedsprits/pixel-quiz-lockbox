import { createFileRoute } from "@tanstack/react-router";

import { getDocument } from "@/data/projects";

/**
 * Serves a protected reference document. Every request is checked on the server:
 * the caller's HTTP-only access cookie must belong to a session that passed the quiz
 * AND verified an email OTP for this exact project. Preview and download both use this route.
 */
export const Route = createFileRoute("/api/project-files/$projectId/$docId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const deny = (status: number, message: string) =>
          Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });

        const doc = getDocument(params.projectId, params.docId);
        if (!doc) return deny(404, "File not found.");

        const { getAccessSession, hasFileAccess } = await import("@/lib/access/access.server");
        const session = await getAccessSession(params.projectId);
        if (!hasFileAccess(session)) {
          return deny(403, "Pass the onboarding quiz and verify your email to open this file.");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("project-documents").download(doc.storagePath);
        if (error || !data) return deny(404, "This file hasn't been uploaded to secure storage yet.");

        const download = new URL(request.url).searchParams.get("download") === "1";
        const encoded = encodeURIComponent(doc.downloadName);
        return new Response(data, {
          status: 200,
          headers: {
            "content-type": doc.mimeType,
            "content-disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encoded}`,
            "cache-control": "private, no-store",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
