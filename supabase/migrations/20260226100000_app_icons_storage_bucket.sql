-- Storage bucket for app icon uploads (bulk upload; admin-only write, public read)
INSERT INTO storage.buckets (id, name, public) VALUES ('app-icons', 'app-icons', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload app icons"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'app-icons'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Anyone can view app icons"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'app-icons');

CREATE POLICY "Admins can update app icons"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'app-icons'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete app icons"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'app-icons'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Allow icons to be stored in Storage (storage_path) with optional inline svg_content for fast render
ALTER TABLE public.app_icon_uploads
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

ALTER TABLE public.app_icon_uploads
  ALTER COLUMN svg_content DROP NOT NULL;

COMMENT ON COLUMN public.app_icon_uploads.storage_path IS 'Path in app-icons bucket, e.g. uploads/icon-name.svg. If set, svg_content may be populated from storage for fast render.';
