import type { Project } from "@/data/types";

/**
 * Public project details shown on the website, as plain text for the assistant. Quiz answers are never
 * included. Document names and descriptions are included only when the documents are unlocked.
 */
export function projectDetailsText(project: Project, includeDocumentList: boolean): string {
  const lines: string[] = [];
  const src = (s?: string) => (s ? ` (source: ${s})` : "");
  lines.push(`Project name: ${project.name}`, `Short name: ${project.shortName}`, `Description: ${project.description}`);
  lines.push(`Status: ${project.status}`);
  if (project.website) lines.push(`Website: ${project.website}`);
  if (project.repository) lines.push(`Repository: ${project.repository}`);
  if (project.team.length) {
    lines.push(`Team${src(project.teamSource)}: ${project.team.map((t) => `${t.name} — ${t.role}`).join("; ")}`);
  }
  if (project.handoverDate) lines.push(`Handover date${src(project.handoverDate.source)}: ${project.handoverDate.value}`);
  if (project.lifecycle) lines.push(`Lifecycle stage${src(project.lifecycle.source)}: ${project.lifecycle.value}`);
  if (project.overview) lines.push(`Overview${src(project.overview.source)}:\n- ${project.overview.value.join("\n- ")}`);
  if (project.stack.length) lines.push(`Technology stack${src(project.stackSource)}: ${project.stack.join(", ")}`);
  const a = project.architecture;
  if (a) {
    lines.push(`Data flow${src(a.flow.source)}: ${a.flow.value.join(" → ")}`);
    lines.push(`Architecture layers${src(a.layers.source)}:\n${a.layers.value.map((l) => `- ${l.name}: ${l.detail}`).join("\n")}`);
    if (a.hardware) {
      lines.push(
        `Hardware and pin map${src(a.hardware.source)}:\n${a.hardware.value.map((h) => `- ${h.component} | pin ${h.pin} | ${h.logic}`).join("\n")}`,
      );
    }
    if (a.security) lines.push(`Security${src(a.security.source)}:\n- ${a.security.value.join("\n- ")}`);
    if (a.access) {
      lines.push(
        `Access matrix${src(a.access.source)}:\n${[a.access.value.headers, ...a.access.value.rows].map((r) => r.join(" | ")).join("\n")}`,
      );
    }
    if (a.ai) lines.push(`AI / RAG${src(a.ai.source)}:\n- ${a.ai.value.join("\n- ")}`);
    if (a.frontend) lines.push(`Frontend${src(a.frontend.source)}:\n- ${a.frontend.value.join("\n- ")}`);
  }
  if (project.decisions.length) {
    lines.push(`Key decisions:\n${project.decisions.map((d) => `- ${d.value}${src(d.source)}`).join("\n")}`);
  }
  if (project.developmentStatus) {
    const ds = project.developmentStatus;
    lines.push(`Implemented (done)${src(ds.done.source)}:\n- ${ds.done.value.join("\n- ")}`);
    if (ds.inProgress.value.length) lines.push(`In progress (not finished)${src(ds.inProgress.source)}:\n- ${ds.inProgress.value.join("\n- ")}`);
  }
  if (project.pendingTasks.length) lines.push(`Pending tasks:\n${project.pendingTasks.map((t) => `- ${t.value}${src(t.source)}`).join("\n")}`);
  if (project.blockers.length) lines.push(`Blockers:\n${project.blockers.map((t) => `- ${t.value}${src(t.source)}`).join("\n")}`);
  if (project.toConfirm.length) {
    lines.push(`Unverified observations (NOT confirmed facts):\n- ${project.toConfirm.join("\n- ")}`);
  }
  if (project.milestones.length) {
    lines.push(`Milestones:\n${project.milestones.map((m) => `- ${m.title} (due ${m.due}, ${m.done ? "done" : "not done"})`).join("\n")}`);
  }
  if (includeDocumentList && project.documents.length) {
    lines.push(`Project documents:\n${project.documents.map((d) => `- ${d.name} (${d.typeLabel}): ${d.description}`).join("\n")}`);
  }
  return lines.join("\n\n");
}
