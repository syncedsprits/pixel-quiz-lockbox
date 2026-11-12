# Roadmap

- [x] Real sign-in (Cloud accounts) replaces demo sign-in; signed-in pages and server checks require a valid session
- [x] Quiz pass (2+ of 4) opens Email Verification automatically; works inside the editor preview
- [x] Email OTP: server-generated 6-digit code, hashed, 60s expiry, resend invalidates old code, tied to user + browser session
- [x] Files and AI Assistant locked until quiz + email code verified (server-enforced)
- [x] Gmail connection for sending codes (tested with a real inbox)
- [ ] Upload the seven Trans-Shield documents to secure storage (blocked: user must attach them)
- [ ] Create the user accounts that may sign in (blocked: user decision)
