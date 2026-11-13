import { createFileRoute } from "@tanstack/react-router";

/**
 * Serves a protected reference document to this same site. Preview and download both use it.
 * The checks live in serveProjectFile (sign-in + quiz pass + verified email code for this project).
 */
export const Route = createFileRoute("/api/project-files/$projectId/$docId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { serveProjectFile } = await import("@/lib/access/file-serve.server");
        return serveProjectFile(request, params.projectId, params.docId);
      },
    },
  },
});
