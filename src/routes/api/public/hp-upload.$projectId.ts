import { createFileRoute } from "@tanstack/react-router";

/**
 * Same shared-upload service as /api/project-upload, for the copy of this site hosted elsewhere
 * (e.g. Vercel). Only allow-listed websites may call it (CORS); sign-in and project access are
 * still checked on every request.
 */
export const Route = createFileRoute("/api/public/hp-upload/$projectId")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { preflight } = await import("@/lib/backend/cors.server");
        return preflight(request);
      },
      POST: async ({ request, params }) => {
        const { originRejected, withCors } = await import("@/lib/backend/cors.server");
        const rejected = originRejected(request);
        if (rejected) return rejected;
        const { handleUploadRequest } = await import("@/lib/files/uploads-ops.server");
        return withCors(request, await handleUploadRequest(request, params.projectId));
      },
    },
  },
});
