import { createFileRoute } from "@tanstack/react-router";

/**
 * Same protected file service as /api/project-files, for the copy of this site hosted elsewhere
 * (e.g. Vercel). Only allow-listed websites may read responses (CORS), and every request is still
 * checked for sign-in + quiz pass + verified email code.
 */
export const Route = createFileRoute("/api/public/hp-files/$projectId/$docId")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/backend/cors.server");
        return preflight(request);
      },
      GET: async ({ request, params }) => {
        const { originRejected, withCors } = await import("@/lib/backend/cors.server");
        const rejected = originRejected(request);
        if (rejected) return rejected;
        const { serveProjectFile } = await import("@/lib/access/file-serve.server");
        return withCors(request, await serveProjectFile(request, params.projectId, params.docId));
      },
    },
  },
});
