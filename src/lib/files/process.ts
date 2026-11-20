import { checkSignature, getFormat, validateFile } from "./formats";
import { extractContent, ExtractionError } from "./extract";
import { extractedText, extractionSummary } from "./extracted";
import { maskExtracted, scanNote } from "./masking";
import { saveFile, StorageUnavailableError, type StoredFile } from "./store";

export type UploadStage = "reading" | "checking" | "extracting" | "saving";

export interface UploadProgress {
  stage: UploadStage;
  percent: number;
}

export class UploadError extends Error {}

function readWithProgress(file: File, onProgress: (fraction: number) => void): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new UploadError("The file couldn't be read from your device."));
    reader.readAsArrayBuffer(file);
  });
}

/** Validates, reads, extracts and saves one file into a project's shared library. Resolves only after the server confirms the save. */
export async function processUpload(
  file: File,
  projectId: string,
  onProgress: (p: UploadProgress) => void,
): Promise<StoredFile> {
  const valid = validateFile(file);
  if (!valid.ok) throw new UploadError(valid.error);

  onProgress({ stage: "reading", percent: 0 });
  const buffer = await readWithProgress(file, (f) => onProgress({ stage: "reading", percent: Math.round(f * 40) }));

  onProgress({ stage: "checking", percent: 45 });
  const sigError = checkSignature(valid.ext, new Uint8Array(buffer.slice(0, 16)));
  if (sigError) throw new UploadError(sigError);

  onProgress({ stage: "extracting", percent: 55 });
  let extracted;
  try {
    extracted = await extractContent(valid.ext, buffer, file.type);
  } catch (e) {
    throw new UploadError(e instanceof ExtractionError ? e.message : "This file couldn't be processed — it may be corrupted or unreadable.");
  }

  // Mask sensitive values before anything is summarised, saved or shown.
  const masked = maskExtracted(extracted);
  extracted = masked.extracted;

  onProgress({ stage: "saving", percent: 85 });
  let record: StoredFile;
  try {
    record = await saveFile({
      projectId,
      file,
      buffer,
      extracted,
      summary: `${extractionSummary(extracted)} · ${scanNote(valid.ext, masked.count)}`.slice(0, 200),
      hasText: extractedText(extracted).trim().length > 0,
      processing: extracted.kind === "none" || extracted.kind === "image" ? "stored" : "processed",
    });
  } catch (e) {
    throw new UploadError(
      e instanceof StorageUnavailableError || e instanceof Error ? e.message : "Saving the file failed. Please try again.",
    );
  }
  onProgress({ stage: "saving", percent: 100 });
  // Drop the local original so previews always load the server's redacted copy.
  const { blob: _original, ...rest } = record;
  return rest;
}
