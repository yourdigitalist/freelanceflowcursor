-- Note images bucket for inline images in notes (upload from editor)
INSERT INTO storage.buckets (id, name, public) VALUES ('note-images', 'note-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload note images" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view note images" ON storage.objects FOR SELECT
USING (bucket_id = 'note-images');

CREATE POLICY "Users can update own note images" ON storage.objects FOR UPDATE
USING (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own note images" ON storage.objects FOR DELETE
USING (bucket_id = 'note-images' AND auth.uid()::text = (storage.foldername(name))[1]);
