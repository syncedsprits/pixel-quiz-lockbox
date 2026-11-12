import { OTP_EMAIL_SUBJECT, OTP_TTL_SECONDS, otpEmailText } from "./otp-rules";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

const b64 = (s: string) => btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));
const b64url = (s: string) => b64(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

function otpEmailHtml(code: string): string {
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1f2433">
<div style="max-width:480px;margin:0 auto;padding:32px 24px">
<p style="font-size:15px;margin:0 0 16px">Hello,</p>
<p style="font-size:15px;margin:0 0 12px">Your one-time verification code is:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:0 0 20px;color:#4b3fd6">${code}</p>
<p style="font-size:14px;margin:0 0 12px">This code is valid for ${OTP_TTL_SECONDS} seconds. Do not share this code with anyone.</p>
<p style="font-size:14px;margin:0 0 20px;color:#5b6172">If you did not request this code, please ignore this email.</p>
<p style="font-size:14px;margin:0">Regards,<br>Project Verification System</p>
</div></body></html>`;
}

function rawEmail(to: string, code: string): string {
  const boundary = `otp_${crypto.randomUUID().replace(/-/g, "")}`;
  const message = [
    `To: ${to}`,
    `Subject: ${header(OTP_EMAIL_SUBJECT)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(otpEmailText(code)),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(otpEmailHtml(code)),
    `--${boundary}--`,
    "",
  ].join("\r\n");
  return b64url(message);
}

export type SendResult = { ok: true } | { ok: false; error: string };

/** Sends the code from the project owner's connected Gmail account. Only a 2xx from Gmail counts as sent. */
export async function sendOtpEmail(to: string, code: string): Promise<SendResult> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const gmailKey = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lovableKey || !gmailKey) {
    console.error("[otp] Gmail connection is not configured", { lovableKey: !!lovableKey, gmailKey: !!gmailKey });
    return { ok: false, error: "Email sending isn't configured: the Gmail connection is missing. Please ask the project owner to reconnect Gmail." };
  }
  let res: Response;
  try {
    res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmailKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: rawEmail(to, code) }),
    });
  } catch (e) {
    console.error("[otp] Gmail request failed", e);
    return { ok: false, error: "The email service couldn't be reached. Please try again in a moment." };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[otp] Gmail send failed [${res.status}]: ${body.slice(0, 500)}`);
    if (res.status === 429) return { ok: false, error: "The email service is busy right now. Please wait a minute and try again." };
    if (res.status === 400) return { ok: false, error: "This email address was rejected by the email service. Please check it and try again." };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "The email service refused to send (the Gmail connection needs attention). Please ask the project owner to reconnect Gmail." };
    }
    return { ok: false, error: `The email couldn't be sent (email service error ${res.status}). Please try again.` };
  }
  return { ok: true };
}
