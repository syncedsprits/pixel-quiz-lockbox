/** Shared OTP timing and limit rules. The server is the authority; the browser only mirrors them. */
export const OTP_TTL_SECONDS = 60;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_VERIFY_ATTEMPTS = 5;
export const OTP_MAX_SENDS_PER_WINDOW = 5;
export const OTP_SEND_WINDOW_MINUTES = 60;

export const OTP_INCORRECT_MESSAGE = "Incorrect OTP. Please enter the correct verification code.";
export const OTP_EXPIRED_MESSAGE = "OTP expired. Please request a new OTP.";

export const OTP_EMAIL_SUBJECT = "Your Project File Access Verification Code";

export function isOtpExpired(sentAt: Date, now: Date): boolean {
  return now.getTime() >= sentAt.getTime() + OTP_TTL_SECONDS * 1000;
}

export function canResend(sentAt: Date | null, now: Date): boolean {
  return !sentAt || now.getTime() >= sentAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000;
}

/** Plain-text body of the verification email. */
export function otpEmailText(code: string): string {
  return [
    "Hello,",
    "",
    `Your verification code is: ${code}`,
    "",
    `This code is valid for ${OTP_TTL_SECONDS} seconds. Do not share this code with anyone.`,
    "",
    "If you did not request this code, please ignore this email.",
    "",
    "Regards,",
    "Project Verification System",
  ].join("\r\n");
}

/** Turns uniformly random 32-bit values into a uniform 6-digit code (rejection sampling, no modulo bias). */
export function codeFromRandom(next: () => number): string {
  const limit = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  for (;;) {
    const v = next();
    if (v < limit) return String(v % 1_000_000).padStart(6, "0");
  }
}
