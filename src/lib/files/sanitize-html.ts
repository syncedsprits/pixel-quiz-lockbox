const ALLOWED = new Set([
  "P", "H1", "H2", "H3", "H4", "H5", "H6", "STRONG", "B", "EM", "I", "U", "S", "SUB", "SUP", "BR", "UL", "OL", "LI",
  "TABLE", "THEAD", "TBODY", "TR", "TD", "TH", "A", "PRE", "CODE", "BLOCKQUOTE", "SPAN", "DIV", "IMG",
]);
const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "FORM", "LINK", "META", "SVG", "MATH"]);

/** Keeps a small set of formatting tags from converted documents and drops scripts, handlers and unsafe links. */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";
  // Deepest elements first, so unwrapping a parent never skips its children.
  for (const el of Array.from(root.querySelectorAll("*")).reverse()) {
    const tag = el.tagName.toUpperCase();
    if (DROP.has(tag)) {
      el.remove();
      continue;
    }
    if (!ALLOWED.has(tag)) {
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const keep =
        (tag === "A" && name === "href" && /^(https?:|mailto:|#)/i.test(attr.value.trim())) ||
        (tag === "IMG" && name === "src" && /^data:image\/(png|jpe?g|gif|webp);/i.test(attr.value)) ||
        ((tag === "TD" || tag === "TH") && (name === "colspan" || name === "rowspan"));
      if (!keep) el.removeAttribute(attr.name);
    }
    if (tag === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  }
  return root.innerHTML;
}
