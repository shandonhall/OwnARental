-- FICA document storage — private bucket; no anon/authenticated policies.
-- Uploads and signed URLs should go through NestJS using the service role (server-only).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fica-documents',
  'fica-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Supabase enables RLS on storage.objects by default; do not add broad read policies here.
