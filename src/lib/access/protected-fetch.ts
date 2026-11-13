import { backendAuthHeaders, remoteBackendOrigin } from "@/lib/backend/remote-backend";

/**
 * Fetches a protected project file. The server checks both the signed-in user (bearer token)
 * and this browser session's project access (quiz + verified email) before returning any bytes.
 * On a copy of the site hosted elsewhere, the same file is fetched from the Lovable-hosted backend.
 */
export async function fetchProtectedFile(url: string): Promise<Response> {
  const origin = remoteBackendOrigin();
  const target = !origin
    ? url
    : url.startsWith("/api/project-files/")
      ? `${origin}/api/public/hp-files/${url.slice("/api/project-files/".length)}`
      : url.startsWith("/api/project-uploads/")
        ? `${origin}/api/public/hp-uploads/${url.slice("/api/project-uploads/".length)}`
        : url;
  return fetch(target, {
    mode: origin ? "cors" : "same-origin",
    credentials: origin ? "omit" : "same-origin",
    cache: "no-store",
    headers: await backendAuthHeaders(),
  });
}
