# Roadmap

- [x] Email OTP: app-generated 6-digit code sent through the owner's Gmail, hashed in DB, 60s expiry, resend invalidates old code, session-only access cookie
- [x] Test OTP end to end with a real inbox (correct, incorrect, expired, resent, direct URL, new browser session)
- [x] AI Assistant: project-scoped, document-grounded answers (retrieval over project documents), project-only policy, session history
- [x] Assistant uses locked documents only after the visitor unlocked that project's files
- [x] Test assistant with the 9 question types
- [ ] Re-upload of the five original Trans-Shield documents (blocked: user must re-attach them)
