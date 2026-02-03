-- Business logos bucket and RLS so users can upload their company logo
INSERT INTO storage.buckets (id, name, public) VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Users can upload to their own folder: {user_id}/...
CREATE POLICY "Users can upload business logos" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Anyone can view (public bucket for logo URLs)
CREATE POLICY "Anyone can view business logos" ON storage.objects FOR SELECT
USING (bucket_id = 'business-logos');

-- Users can update/delete their own files
CREATE POLICY "Users can update business logos" ON storage.objects FOR UPDATE
USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete business logos" ON storage.objects FOR DELETE
USING (bucket_id = 'business-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
