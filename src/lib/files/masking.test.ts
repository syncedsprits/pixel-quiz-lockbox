import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { FULL_MASK, isScannableUpload, maskExtracted, maskSensitiveText } from "./masking";
import { redactUpload } from "./redact.server";

const m = (s: string) => maskSensitiveText(s).text;

describe("sensitive information masking", () => {
  it("phone numbers keep only the last 2 digits", () => {
    expect(m("Call +91 98765 43210 now")).toBe("Call +XX XXXXX XXX10 now");
    expect(m("Mobile: 9876543210")).toBe("Mobile: XXXXXXXX10");
  });
  it("account numbers keep only the last 2 digits", () => {
    expect(m("Account number: 123456789012")).toBe("Account number: XXXXXXXXXX12");
    expect(m("Card 4111 1111 1111 1111")).toContain("XXXX XXXX XXXX XX11");
  });
  it("passwords, API keys and tokens are replaced fully", () => {
    expect(m("password: hunter2")).toBe(`password: ${FULL_MASK}`);
    expect(m("API_KEY=abcd1234efgh")).toBe(`API_KEY=${FULL_MASK}`);
    expect(m("key AIzaSyA1234567890abcdefghijklmnopqrstu")).toBe(`key ${FULL_MASK}`);
    expect(m("Authorization: Bearer eyJhbGciOi.eyJzdWIiOiIx.c2lnbmF0dXJl")).not.toContain("eyJ");
  });
  it("leaves ordinary project text unchanged", () => {
    const t = "MQ-4 and MQ-7 sensors on GPIO 34/35, version 1.2.3, 2026-11-20, 768 dimensions.";
    expect(m(t)).toBe(t);
  });
  it("masks text inside HTML without touching tags", () => {
    const { extracted, count } = maskExtracted({ kind: "html", html: "<p>Phone 9876543210</p>", warnings: [] });
    expect(count).toBe(1);
    expect(extracted).toEqual({ kind: "html", html: "<p>Phone XXXXXXXX10</p>", warnings: [] });
  });
});

describe("redacted copies served to users", () => {
  it("text files are served masked", async () => {
    const r = await redactUpload("a.txt", "txt", new TextEncoder().encode("password=secret123\nPhone 9876543210"));
    expect(r.ok && r.body).toBe(`password=${FULL_MASK}\nPhone XXXXXXXX10`);
  });
  it("DOCX is served as masked text, never the original", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", "<w:document><w:body><w:p><w:r><w:t>Account no: 556677889900</w:t></w:r></w:p></w:body></w:document>");
    const bytes = await zip.generateAsync({ type: "uint8array" });
    const r = await redactUpload("plan.docx", "docx", bytes);
    expect(r.ok && r.body).toBe("Account no: XXXXXXXXXX00");
    expect(r.ok && r.fileName).toBe("plan.docx.redacted.txt");
  });
  it("unscannable formats are flagged and nothing is served", async () => {
    expect(isScannableUpload("png")).toBe(false);
    expect(isScannableUpload("xlsx")).toBe(false);
    expect((await redactUpload("x.png", "png", new Uint8Array([1, 2]))).ok).toBe(false);
    expect((await redactUpload("x.docx", "docx", new Uint8Array([1, 2, 3]))).ok).toBe(false);
    expect((await redactUpload("e.txt", "txt", new Uint8Array())).ok).toBe(false);
  });
});
