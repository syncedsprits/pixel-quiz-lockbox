import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 8;

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address")
  .max(254, "Email is too long")
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(128, "Password is too long");

export const signInSchema = z.object({ email: emailSchema, password: passwordSchema });

/** Demo entry screen: any non-empty email and any non-empty password are accepted. */
export const entrySchema = z.object({
  email: z.string().trim().min(1, "Enter your email address").max(254, "Email is too long"),
  password: z.string().min(1, "Enter your password").max(128, "Password is too long"),
});

/** "kaviya.dharshini@acme.com" -> "Kaviya Dharshini" */
export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const words = local
    .split(/[._\-+]+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);
  if (words.length === 0) return "Guest";
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}
