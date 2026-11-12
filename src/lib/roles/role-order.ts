/**
 * Role selection asked before a project's quiz, and the role-based display order of that
 * project's reference documents. The role never grants or removes access: it only reorders
 * documents the user is already allowed to open. Nothing here hides, renames or adds documents.
 */
export const OTHER_ROLE = "Other";

export const PRESET_ROLES = [
  "UI/UX Developer",
  "Idea Developer",
  "Frontend Developer",
  "Backend Developer",
  "Architecture & Management",
] as const;

export const ROLE_OPTIONS = [...PRESET_ROLES, OTHER_ROLE] as const;

export const ROLE_MAX_LENGTH = 80;

/** Trims and validates a role; returns null when it is empty or too long. */
export function normalizeRole(raw: string): string | null {
  const role = raw.trim().replace(/\s+/g, " ");
  if (!role || role.length > ROLE_MAX_LENGTH) return null;
  return role;
}

export type DocCategory =
  | "overview"
  | "uiux"
  | "idea"
  | "product"
  | "frontend"
  | "backend"
  | "architecture"
  | "planning"
  | "data";

/**
 * Category of each existing reference document, judged from its title and content summary.
 * A category with no document (for example UI/UX design) is simply skipped.
 */
export const DOCUMENT_CATEGORIES: Record<string, DocCategory[]> = {
  "ts-master-project-overview": ["overview"],
  "ts-frontend-scada": ["frontend"],
  "ts-backend-rag": ["backend"],
  "ts-architecture-security": ["architecture"],
  // Executive summary, team ownership matrix, decision log, database schema and hardware pinout.
  "ts-complete-reference": ["idea", "planning", "data"],
  // Lifecycle status, sensor configuration, PostgreSQL schema and RAG rules.
  "ts-markdown": ["product", "data"],
  // Failed approaches, lessons learned and approaches to avoid.
  "ts-dead-end-ledger": ["planning"],
};

/** Category order after Project Overview for each preset role. */
export const ROLE_CATEGORY_ORDER: Record<(typeof PRESET_ROLES)[number], DocCategory[]> = {
  "UI/UX Developer": ["uiux", "frontend", "backend", "architecture"],
  "Idea Developer": ["idea", "product", "architecture", "uiux", "frontend", "backend"],
  "Frontend Developer": ["frontend", "uiux", "architecture", "backend"],
  "Backend Developer": ["backend", "architecture", "data", "frontend"],
  "Architecture & Management": ["architecture", "planning", "backend", "frontend", "uiux"],
};

/** Keywords in a custom role mapped to the document categories that suit it, most relevant first. */
const CUSTOM_ROLE_RULES: { pattern: RegExp; categories: DocCategory[] }[] = [
  { pattern: /\b(ui|ux|design(er)?|visual|graphic)\b/, categories: ["uiux", "frontend"] },
  { pattern: /\b(front ?end|web|mobile|react|next(\.?js)?|scada|dashboard|interface)\b/, categories: ["frontend"] },
  { pattern: /\b(ai|ml|machine learning|rag|llm|nlp|chatbot|prompt|data scientist|deep learning)\b/, categories: ["backend", "data"] },
  { pattern: /\b(back ?end|api|server|fastapi|python|integration)\b/, categories: ["backend", "data"] },
  { pattern: /\b(iot|embedded|hardware|firmware|electrical|electronics?|sensors?|esp32|power|grid|mqtt)\b/, categories: ["data", "architecture"] },
  { pattern: /\b(database|dba|sql|postgres(ql)?|data engineer|data)\b/, categories: ["data", "backend"] },
  { pattern: /\b(security|cyber|devops|cloud|infrastructure|network|architect(ure)?|system)\b/, categories: ["architecture"] },
  { pattern: /\b(product|requirements?|business|analyst|idea|concept|research(er)?|strategy)\b/, categories: ["idea", "product"] },
  { pattern: /\b(manager|management|lead|leader|owner|scrum|planning|coordinator|director|head)\b/, categories: ["planning", "architecture"] },
  { pattern: /\b(qa|test(er|ing)?|quality|support|maintenance|debug)\b/, categories: ["planning", "frontend", "backend"] },
];

/** Categories relevant to a role, most relevant first. Empty when nothing can be matched confidently. */
export function categoriesForRole(role: string | null | undefined): DocCategory[] {
  const r = role ? normalizeRole(role) : null;
  if (!r) return [];
  if ((PRESET_ROLES as readonly string[]).includes(r)) return ROLE_CATEGORY_ORDER[r as (typeof PRESET_ROLES)[number]];
  const text = r.toLowerCase();
  const out: DocCategory[] = [];
  for (const rule of CUSTOM_ROLE_RULES) {
    if (!rule.pattern.test(text)) continue;
    for (const c of rule.categories) if (!out.includes(c)) out.push(c);
  }
  return out;
}

/**
 * Returns every document exactly once: Project Overview first, then documents matching the role's
 * categories in order, then all remaining documents in their existing order. Without a role (or
 * when a custom role matches nothing), the existing order is kept after Project Overview.
 */
export function orderDocumentsForRole<T extends { id: string }>(documents: T[], role: string | null | undefined): T[] {
  const cats = (id: string) => DOCUMENT_CATEGORIES[id] ?? [];
  const placed = new Set<string>();
  const out: T[] = [];
  const take = (d: T) => {
    if (placed.has(d.id)) return;
    placed.add(d.id);
    out.push(d);
  };
  documents.filter((d) => cats(d.id).includes("overview")).forEach(take);
  for (const c of categoriesForRole(role)) documents.filter((d) => cats(d.id).includes(c)).forEach(take);
  documents.forEach(take);
  return out;
}
