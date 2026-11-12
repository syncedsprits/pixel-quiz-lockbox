import { describe, expect, it } from "vitest";

import { projects } from "@/data/projects";
import { buildHandoverPackage, parseHandoverPackage } from "./handover-package";

describe("Handover package import/export", () => {
  it("re-imports an exported project with the same name", () => {
    const pkg = buildHandoverPackage(projects[0]!);
    const parsed = parseHandoverPackage(JSON.stringify(pkg));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.project.name).toBe(
      "TRANS SHIELD AI SMART POWER GRID MONITORING AND PREDICTIVE PROTECTION",
    );
  });

  it("rejects a file that is not JSON", () => {
    expect(parseHandoverPackage("hello").ok).toBe(false);
  });

  it("rejects JSON that is not a HandoverPulse package", () => {
    expect(parseHandoverPackage(JSON.stringify({ name: "x" })).ok).toBe(false);
  });
});
