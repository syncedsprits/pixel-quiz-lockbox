import { createFileRoute } from "@tanstack/react-router";

/** Receives a file for a project's shared library (this same site). Checks live in handleUploadRequest. */
export const Route = createFileRoute("/api/project-upload/$projectId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const { handleUploadRequest } = await import("@/lib/files/uploads-ops.server");
        return handleUploadRequest(request, params.projectId);
      },
    },
  },
});
