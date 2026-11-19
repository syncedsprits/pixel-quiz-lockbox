ALTER TABLE public.project_access_sessions
  ADD COLUMN approval_status text NOT NULL DEFAULT 'none',
  ADD COLUMN approval_requested_at timestamptz,
  ADD COLUMN approval_decided_at timestamptz;
ALTER TABLE public.project_access_sessions
  ADD CONSTRAINT project_access_sessions_approval_status_check
  CHECK (approval_status IN ('none','pending','approved','declined'));
CREATE INDEX project_access_sessions_pending_idx
  ON public.project_access_sessions (project_id, approval_status);