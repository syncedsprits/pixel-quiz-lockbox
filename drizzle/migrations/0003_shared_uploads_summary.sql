ALTER TABLE public.project_uploads ADD COLUMN summary text NOT NULL DEFAULT '' CHECK (char_length(summary) <= 200);
ALTER TABLE public.project_uploads ADD COLUMN has_text boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.project_uploads.extracted IS 'DEPRECATED: unused; file content is read from the original file when previewed';