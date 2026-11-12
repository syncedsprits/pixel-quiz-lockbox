import { describe, expect, it } from "vitest";

import { getProject, SKYGRID_ID, TRANS_SHIELD_ID } from "@/data/projects";
import { chunkText, NOT_DOCUMENTED_REPLY, OFF_TOPIC_REPLY } from "./policy";
import { projectDetailsText } from "./project-context";

const ts = getProject(TRANS_SHIELD_ID)!;

describe("assistant replies required by the brief", () => {
  it("off-topic reply text", () =>
    expect(OFF_TOPIC_REPLY).toBe(
      "I'm your Project AI Assistant. I can answer questions related to this project's architecture, hardware, software, working principle, implementation, and documentation. Please ask me something related to the project.",
    ));
  it("not-documented reply text", () =>
    expect(NOT_DOCUMENTED_REPLY).toBe(
      "This information is not available in the current project documentation. Please provide the relevant details so I can answer accurately.",
    ));
});

describe("project context given to the assistant", () => {
  it("never includes quiz questions or answers", () => {
    const text = projectDetailsText(ts, true);
    for (const q of ts.quiz) expect(text).not.toContain(q.prompt);
  });
  it("lists document names only when the files are unlocked", () => {
    const doc = ts.documents.find((d) => d.id === "ts-dead-end-ledger")!;
    expect(projectDetailsText(ts, false)).not.toContain(doc.name);
    expect(projectDetailsText(ts, true)).toContain(doc.name);
  });
  it("keeps projects separate", () => {
    const sky = projectDetailsText(getProject(SKYGRID_ID)!, true);
    expect(sky).not.toContain("ESP32");
    expect(sky).not.toContain(ts.name);
  });
});

describe("document chunking", () => {
  it("keeps every paragraph and bounds chunk size", () => {
    const paras = Array.from({ length: 30 }, (_, i) => `Paragraph ${i} ` + "x".repeat(150));
    const chunks = chunkText(paras.join("\n\n"), 1200, 200);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(1400);
    for (let i = 0; i < 30; i++) expect(chunks.some((c) => c.includes(`Paragraph ${i} `))).toBe(true);
  });
});
