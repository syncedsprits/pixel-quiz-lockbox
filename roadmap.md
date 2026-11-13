# Roadmap

- [x] Real sign-in (Cloud accounts) replaces demo sign-in; signed-in pages and server checks require a valid session
- [x] Quiz pass (2+ of 4) opens Email Verification automatically; works inside the editor preview
- [x] Email OTP: server-generated 6-digit code, hashed, 60s expiry, resend invalidates old code, tied to user + browser session
- [x] Files and AI Assistant locked until quiz + email code verified (server-enforced)
- [x] Gmail connection for sending codes (tested with a real inbox)
- [x] Upload the six supplied Trans-Shield documents to secure storage; old placeholder entry removed; preview + download verified
- [x] Public "Create account" on the login card with email confirmation
- [x] Vercel copy of the site uses the Lovable-hosted server for quiz, email codes, files and assistant (needs Lovable publish + one Vercel setting)
- [ ] Shared project uploads visible to all authorized users (waiting on user's choice of who can see/delete)
- [ ] Editable profile in Settings saved to the database (waiting on user's choice of how a profile is matched after re-login)
