function clickDownload(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  clickDownload(url, name);
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Reads the server's explanation from a failed file response. */
export async function responseError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body?.error) return body.error;
  } catch {
    /* not JSON */
  }
  return `${fallback} (${res.status}).`;
}

/** Downloads a same-origin file under its original name. Throws if the file can't be fetched. */
export async function downloadUrl(url: string, name: string, mime: string) {
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) throw new Error(await responseError(res, "Download failed"));
  const blob = await res.blob();
  downloadBlob(new Blob([blob], { type: mime }), name);
}
