<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->


## Project rules

- Project data lives in `src/data/projects.ts`; only facts found in a supplied project document go there, and unknown fields stay empty so the UI shows "Not provided yet". Why: the user forbids invented project details, history or status.
- Supplied reference documents live in the private Cloud storage bucket `project-documents` under `<projectId>/<file name>`, are listed in exactly one project's `documents`, and are served only by `/api/project-files/$projectId/$docId`. Why: files must never mix between projects and must stay locked until access is granted.
- Sign-in is a demo entry screen: any non-empty email + password creates an anonymous Lovable Cloud session through `src/lib/auth/cloud-adapter.ts` (entered email kept as `entered_email` metadata for display only); `/_authenticated` checks the session with the auth server (`ssr: false`) and every access/assistant server function uses `requireSupabaseAuth`. Why: the user wants no account checks at entry, while quiz/OTP access must still bind to a real server session.
- Access to a quiz-protected project's files requires a server-graded quiz pass plus a verified email code, tracked in `project_access_sessions` bound to the signed-in user and to a random per-browser-session token (sessionStorage, sent as the `x-hp-access` header by `attachAccessTokens` and `fetchProtectedFile`), checked on every file request (`src/lib/access/`). Why: file protection must be enforced on the server, and cookies are blocked inside the embedded preview.
- Email codes are generated on the server (`src/lib/access/`), stored only as an HMAC (`OTP_HASH_SECRET`) bound to the access session and email, and sent from the owner's connected Gmail through the connector gateway (`otp-email.server.ts`); expiry, cooldown and attempt limits come from server timestamps. Why: no sender domain exists, and codes must never reach browser code or count as sent unless Gmail accepted them.
- User uploads are stored in browser IndexedDB (`src/lib/files/store.ts`), keyed and filtered by projectId on every read and delete, and labelled "Local mode" in the UI. Why: uploads are not yet stored in Cloud; never show a saved state unless the write is confirmed.
- File parsing (`src/lib/files/extract.ts`) runs in the browser with dynamically imported parsers (pdfjs-dist, mammoth, xlsx, jszip) and throws `ExtractionError` instead of reporting partial success. Why: keeps heavy parsers out of SSR and avoids fake success states.
- Converted document HTML is rendered only after `sanitizeHtml`. Why: uploaded documents are untrusted.
- The AI Assistant (`src/lib/assistant/`) answers per selected project from `projectDetailsText` plus retrieval over that project's documents only (`project_knowledge_chunks`, pgvector, re-indexed automatically when a storage object changes). Locked documents are used only when the caller has file access for that project. Why: answers must stay grounded, never mix projects, and never leak locked files.
- The role question before a project's quiz (`src/lib/roles/`) is stored per browser session and saved on the access session at quiz submit; it only reorders that project's reference documents (Project Overview always first, every document kept) and never affects access. Why: the user wants role-personalised file order without weakening quiz + OTP protection.
- A copy of the site hosted outside Lovable (e.g. Vercel) sets `VITE_HP_BACKEND_URL` to the Lovable-hosted address; the browser then calls `/api/public/hp/$op` and `/api/public/hp-files/...` there (`src/lib/backend/`), which run the same logic as the server functions (`access-ops.server.ts`, `assistant-ops.server.ts`, `file-serve.server.ts`), require a verified bearer token, and accept browser calls only from allow-listed origins (`cors.server.ts`, extendable via `HP_ALLOWED_ORIGINS`). Why: privileged keys, the OTP secret and the Gmail/AI gateways exist only on Lovable hosting and must never be copied to the external host.
