import { z } from "zod";

import { projectIdSchema } from "@/lib/access/access-schemas";

export const listUploadsSchema = z.object({ projectId: projectIdSchema.nullable() });
export const deleteUploadSchema = z.object({ projectId: projectIdSchema, uploadId: z.string().uuid() });

/** A shared upload as the browser sees it. Content is read from the original file when previewed. */
export interface SharedUpload {
  id: string;
  projectId: string;
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  category: string;
  uploadedAt: string;
  processing: "processed" | "stored";
  summary: string;
  hasText: boolean;
  canRemove: boolean;
}
