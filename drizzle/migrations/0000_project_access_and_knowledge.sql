CREATE TABLE public.project_access_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  project_id text NOT NULL,
  quiz_score integer NOT NULL,
  quiz_total integer NOT NULL,
  quiz_passed_at timestamptz NOT NULL DEFAULT now(),
  email text,
  otp_hash text,
  otp_sent_at timestamptz,
  otp_send_count integer NOT NULL DEFAULT 0,
  otp_window_started_at timestamptz,
  otp_attempts integer NOT NULL DEFAULT 0,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 hours')
);

GRANT ALL ON public.project_access_sessions TO service_role;
ALTER TABLE public.project_access_sessions ENABLE ROW LEVEL SECURITY;
-- No policies: only trusted server code can read or write access sessions.

CREATE INDEX project_access_sessions_expires_idx ON public.project_access_sessions (expires_at);
CREATE INDEX project_access_sessions_user_project_idx ON public.project_access_sessions (user_id, project_id);

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE public.project_knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  doc_id text NOT NULL,
  doc_name text NOT NULL,
  source_version text NOT NULL,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  embedding extensions.vector(768) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, doc_id, chunk_index)
);
CREATE INDEX project_knowledge_chunks_project_doc_idx ON public.project_knowledge_chunks (project_id, doc_id);

GRANT ALL ON public.project_knowledge_chunks TO service_role;
ALTER TABLE public.project_knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.match_project_chunks(
  _project_id text,
  _doc_ids text[],
  _query extensions.vector(768),
  _count integer
)
RETURNS TABLE (doc_id text, doc_name text, chunk_index integer, content text, similarity double precision)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  SELECT c.doc_id, c.doc_name, c.chunk_index, c.content, 1 - (c.embedding <=> _query) AS similarity
  FROM public.project_knowledge_chunks c
  WHERE c.project_id = _project_id AND c.doc_id = ANY(_doc_ids)
  ORDER BY c.embedding <=> _query
  LIMIT LEAST(GREATEST(_count, 1), 20)
$$;

REVOKE EXECUTE ON FUNCTION public.match_project_chunks(text, text[], extensions.vector, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_project_chunks(text, text[], extensions.vector, integer) TO service_role;