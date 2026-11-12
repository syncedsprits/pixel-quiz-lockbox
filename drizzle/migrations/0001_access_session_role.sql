ALTER TABLE public.project_access_sessions
  ADD COLUMN IF NOT EXISTS role text
  CHECK (role IS NULL OR char_length(role) BETWEEN 1 AND 80);
COMMENT ON COLUMN public.project_access_sessions.role IS 'Role the user picked before the quiz; used only to order project documents, never for access decisions.';