import { describe, expect, it } from "vitest";

import { projects, SKYGRID_ID, TRANS_SHIELD_ID } from "./projects";

describe("Projects section", () => {
  it("has exactly two projects", () => {
    expect(projects).toHaveLength(2);
  });

  it("shows both projects as In Progress and none as completed", () => {
    expect(projects.map((p) => p.status)).toEqual(["in-progress", "in-progress"]);
  });

  it("uses the requested names, websites and repositories", () => {
    const ts = projects.find((p) => p.id === TRANS_SHIELD_ID)!;
    const sg = projects.find((p) => p.id === SKYGRID_ID)!;
    expect(ts.name).toBe("TRANS SHIELD AI SMART POWER GRID MONITORING AND PREDICTIVE PROTECTION");
    expect(ts.website).toBe("https://wind-guardian-ai-ro85.vercel.app/");
    expect(ts.repository).toBe("https://github.com/zerobugsvcetsih-sketch/zerbugs.git");
    expect(sg.name).toBe(
      "SkyGrid AI: Satellite-Driven Energy Optimization and Dual-Layer Predictive Transformer Protection for a Smarter Grid",
    );
    expect(sg.website).toBe("https://project-companion-eight.vercel.app/automation");
    expect(sg.repository).toBe("https://github.com/syncedsprints/project-companion");
  });

  it("attaches the six supplied Trans-Shield documents to Trans-Shield only", () => {
    const ts = projects.find((p) => p.id === TRANS_SHIELD_ID)!;
    const sg = projects.find((p) => p.id === SKYGRID_ID)!;
    expect(ts.documents.map((d) => d.name).sort()).toEqual(
      [
        "Backend and AI RAG Pipeline.docx",
        "Frontend and SCADA Interface.docx",
        "System Architecture and Security Governance.docx",
        "TRANS-SHIELD AI Markdown Documentation",
        "TRANS-SHIELD_AI_-_Master_Project_Overview.pdf",
        "TRANS-SHIELD_AI_Dead-End_Ledger.docx",
      ].sort(),
    );
    expect(sg.documents).toHaveLength(0);
  });

  it("removes the Trans-Shield Project Overview section only", () => {
    const ts = projects.find((p) => p.id === TRANS_SHIELD_ID)!;
    const sg = projects.find((p) => p.id === SKYGRID_ID)!;
    expect(ts.overviewRemoved).toBe(true);
    expect(sg.overviewRemoved).toBeUndefined();
  });

  it("serves every reference document through the access-checked file route", () => {
    for (const d of projects.flatMap((p) => p.documents)) {
      expect(d.url.startsWith("/api/project-files/")).toBe(true);
    }
  });

  it("does not invent SkyGrid details", () => {
    const sg = projects.find((p) => p.id === SKYGRID_ID)!;
    expect(sg.overview).toBeNull();
    expect(sg.architecture).toBeNull();
    expect(sg.team).toHaveLength(0);
    expect(sg.pendingTasks).toHaveLength(0);
    expect(sg.progress).toBeUndefined();
    expect(sg.quiz).toHaveLength(0);
  });
});
