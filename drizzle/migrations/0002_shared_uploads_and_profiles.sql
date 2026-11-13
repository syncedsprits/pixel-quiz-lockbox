-- Shared project uploads: metadata for files every authorized user of a project can see.
-- Only trusted server code (service_role) reads or writes; access is checked per request there
-- (signed in, plus quiz + verified email code for quiz-protected projects).
CREATE TABLE public.project_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL CHECK (char_length(project_id) BETWEEN 1 AND 80),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),
  extension text NOT NULL CHECK (char_length(extension) BETWEEN 1 AND 16),
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  category text NOT NULL,
  processing text NOT NULL DEFAULT 'stored',
  extracted jsonb,
  storage_path text NOT NULL UNIQUE,
  uploaded_by uuid NOT NULL,
  uploader_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX project_uploads_project_created_idx ON public.project_uploads (project_id, created_at DESC);
GRANT ALL ON public.project_uploads TO service_role;
ALTER TABLE public.project_uploads ENABLE ROW LEVEL SECURITY;

-- Editable display profile, keyed by the sign-in email (lower-case). Server code only.
CREATE TABLE public.user_profiles (
  email text PRIMARY KEY CHECK (char_length(email) BETWEEN 1 AND 254),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  updated_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_profiles TO service_role;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;