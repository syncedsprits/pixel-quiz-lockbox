import { createFileRoute } from "@tanstack/react-router";

/**
 * Public API for the copy of this site hosted elsewhere (e.g. Vercel). It runs the same server
 * logic as the server functions, here where the trusted credentials are available.
 * Security: only allow-listed websites may call it from the browser (CORS); every call must carry
 * a sign-in token that is verified with the auth server; access checks are unchanged.
 */
export const Route = createFileRoute("/api/public/hp/$op")({
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
        const reply = (status: number, body: unknown) =>
          withCors(request, Response.json(body, { status, headers: { "cache-control": "no-store" } }));

        const { runRemoteOp, isRemoteOp } = await import("@/lib/backend/remote-ops.server");
        if (!isRemoteOp(params.op)) return reply(404, { error: "Unknown operation." });

        const { userIdFromRequest } = await import("@/lib/access/access.server");
        const userId = await userIdFromRequest(request);
        if (!userId) return reply(401, { error: "Please sign in again." });

        const input: unknown = await request.json().catch(() => null);
        return runRemoteOp(params.op, input, userId)
          .then((result) => reply(200, { result }))
          .catch((e: unknown) => {
            const status = e instanceof BadInput ? 400 : 500;
            if (status === 500) console.error(`[hp api] ${params.op} failed`, e);
            return reply(status, { error: e instanceof Error ? e.message : "Something went wrong. Please try again." });
          });
      },
    },
  },
});

class BadInput extends Error {}
