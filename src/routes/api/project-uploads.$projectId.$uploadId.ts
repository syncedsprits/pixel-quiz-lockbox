import { createFileRoute } from "@tanstack/react-router";

/** Serves a shared upload to this same site (preview + download). Checks live in serveUpload. */
export const Route = createFileRoute("/api/project-uploads/$projectId/$uploadId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { serveUpload } = await import("@/lib/files/uploads-ops.server");
        return serveUpload(request, params.projectId, params.uploadId);
      },
    },
  },
});
