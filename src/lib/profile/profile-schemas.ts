import { z } from "zod";

/** Display name rules shared by the Settings form and the server. */
export const DISPLAY_NAME_MAX = 80;

export const displayNameSchema = z
  .string()
  .transform((s) => s.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1, "Enter a display name.").max(DISPLAY_NAME_MAX, `Use ${DISPLAY_NAME_MAX} characters or fewer.`));

export const updateProfileSchema = z.object({ displayName: displayNameSchema });

export interface Profile {
  displayName: string | null;
}
