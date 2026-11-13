import { describe, expect, it } from "vitest";

import { getProject, TRANS_SHIELD_ID } from "@/data/projects";
import { normalizeRole, orderDocumentsForRole } from "./role-order";

const docs = getProject(TRANS_SHIELD_ID)!.documents;
const order = (role: string | null) => orderDocumentsForRole(docs, role).map((d) => d.id);

describe("role-based document order", () => {
  it.each([
    "UI/UX Developer",
    "Idea Developer",
    "Frontend Developer",
    "Backend Developer",
    "Architecture & Management",
    "IoT Developer",
    "Something unrelated",
    null,
  ])("puts Project Overview first and keeps all 7 documents for %s", (role) => {
    const ids = order(role);
    expect(ids[0]).toBe("ts-master-project-overview");
    expect([...ids].sort()).toEqual(docs.map((d) => d.id).sort());
  });

  it("UI/UX Developer: Frontend, Backend, Architecture after the overview", () => {
    expect(order("UI/UX Developer").slice(1, 4)).toEqual(["ts-frontend-scada", "ts-backend-rag", "ts-architecture-security"]);
  });

  it("Frontend Developer: Frontend, Architecture, Backend after the overview", () => {
    expect(order("Frontend Developer").slice(1, 4)).toEqual(["ts-frontend-scada", "ts-architecture-security", "ts-backend-rag"]);
  });

  it("Backend Developer: Backend, Architecture, then database documents, then Frontend", () => {
    expect(order("Backend Developer").slice(1, 5)).toEqual([
      "ts-backend-rag",
      "ts-architecture-security",
      "ts-markdown",
      "ts-frontend-scada",
    ]);
  });

  it("Architecture & Management: Architecture first, then planning documents", () => {
    expect(order("Architecture & Management").slice(1, 3)).toEqual([
      "ts-architecture-security",
      "ts-dead-end-ledger",
    ]);
  });

  it("Idea Developer: concept and product documents before Architecture", () => {
    expect(order("Idea Developer").slice(1, 3)).toEqual(["ts-markdown", "ts-architecture-security"]);
  });

  it("a custom AI Engineer role puts the Backend and AI RAG document next", () => {
    expect(order("AI Engineer")[1]).toBe("ts-backend-rag");
  });

  it("an unmatched custom role keeps the existing order after the overview", () => {
    const rest = docs.filter((d) => d.id !== "ts-master-project-overview").map((d) => d.id);
    expect(order("Zookeeper").slice(1)).toEqual(rest);
  });

  it("rejects an empty custom role", () => {
    expect(normalizeRole("   ")).toBeNull();
  });
});
