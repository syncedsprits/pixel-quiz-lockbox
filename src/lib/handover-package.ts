import { z } from "zod";

import type { Project } from "@/data/types";

/** Portable JSON format for exporting / importing a project's handover knowledge. */
export const HANDOVER_PACKAGE_VERSION = 1;

const personSchema = z.object({ name: z.string().min(1), role: z.string() });

export const handoverPackageSchema = z.object({
  format: z.literal("handoverpulse.package"),
  version: z.literal(HANDOVER_PACKAGE_VERSION),
  exportedAt: z.string(),
  project: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    // Older packages may use "active" or "completed"; they still import and preview.
    status: z.enum(["in-progress", "active", "handover", "on-hold", "completed"]),
    lead: personSchema,
    team: z.array(personSchema),
    milestones: z.array(z.object({ title: z.string(), due: z.string(), done: z.boolean() })),
    documents: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
  }).passthrough(),
});

export type HandoverPackage = z.infer<typeof handoverPackageSchema>;

export function buildHandoverPackage(project: Project, now = new Date()) {
  return {
    format: "handoverpulse.package" as const,
    version: HANDOVER_PACKAGE_VERSION,
    exportedAt: now.toISOString(),
    project,
  };
}

export type ParseResult = { ok: true; data: HandoverPackage } | { ok: false; error: string };

export function parseHandoverPackage(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't valid JSON." };
  }
  const result = handoverPackageSchema.safeParse(json);
  if (!result.success) {
    return { ok: false, error: "This file isn't a HandoverPulse package (or uses an unsupported version)." };
  }
  return { ok: true, data: result.data };
}
