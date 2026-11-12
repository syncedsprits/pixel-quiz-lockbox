import { describe, expect, it } from "vitest";

import { checkSignature, validateFile } from "./formats";

const f = (name: string, size = 10, type = "") => ({ name, size, type });

describe("Import file validation", () => {
  it.each(["a.pdf", "a.doc", "a.docx", "a.txt", "a.md", "a.rtf", "a.json", "a.csv", "a.xls", "a.xlsx", "a.ppt", "a.pptx", "a.zip", "a.png", "a.jpg", "a.jpeg", "a.webp"])(
    "accepts %s",
    (name) => expect(validateFile(f(name)).ok).toBe(true),
  );

  it("rejects unsupported formats", () => {
    expect(validateFile(f("setup.exe")).ok).toBe(false);
  });

  it("rejects empty files", () => {
    expect(validateFile(f("notes.txt", 0)).ok).toBe(false);
  });

  it("rejects files over 25 MB", () => {
    expect(validateFile(f("big.pdf", 25 * 1024 * 1024 + 1)).ok).toBe(false);
  });

  it("rejects a MIME type that contradicts the extension", () => {
    expect(validateFile(f("photo.png", 10, "application/pdf")).ok).toBe(false);
  });

  it("rejects a renamed file whose contents don't match", () => {
    expect(checkSignature("pdf", new TextEncoder().encode("hello world"))).not.toBeNull();
    expect(checkSignature("pdf", new TextEncoder().encode("%PDF-1.4"))).toBeNull();
  });
});
