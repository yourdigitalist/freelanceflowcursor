-- Client logos for proposals + optional task priority
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS logo_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload client logos" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view client logos" ON storage.objects FOR SELECT
USING (bucket_id = 'client-logos');

CREATE POLICY "Users can update client logos" ON storage.objects FOR UPDATE
USING (bucket_id = 'client-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete client logos" ON storage.objects FOR DELETE
USING (bucket_id = 'client-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

ALTER TABLE public.tasks ALTER COLUMN priority DROP DEFAULT;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_priority_check
  CHECK (priority IS NULL OR priority IN ('low', 'medium', 'high', 'urgent'));
