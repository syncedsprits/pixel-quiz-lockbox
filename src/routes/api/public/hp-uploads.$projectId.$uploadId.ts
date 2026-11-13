import { createFileRoute } from "@tanstack/react-router";

/** Same shared-upload file service as /api/project-uploads, for the copy hosted elsewhere (CORS allow-list). */
export const Route = createFileRoute("/api/public/hp-uploads/$projectId/$uploadId")({
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
        const { serveUpload } = await import("@/lib/files/uploads-ops.server");
        return withCors(request, await serveUpload(request, params.projectId, params.uploadId));
      },
    },
  },
});
