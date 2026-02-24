-- App branding: logo, icon, favicon, optional primary color (single-row config)
CREATE TABLE IF NOT EXISTS public.app_branding (
  id INT PRIMARY KEY DEFAULT 1,
  logo_url TEXT,
  icon_url TEXT,
  favicon_url TEXT,
  primary_color TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed single row so we can upsert
INSERT INTO public.app_branding (id, updated_at) VALUES (1, now())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_branding"
  ON public.app_branding FOR SELECT
  USING (true);

CREATE POLICY "Admins can update app_branding"
  ON public.app_branding FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can insert app_branding"
  ON public.app_branding FOR INSERT
  WITH CHECK (
    id = 1 AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Storage bucket for app branding assets (admin upload, public read)
INSERT INTO storage.buckets (id, name, public) VALUES ('app-branding', 'app-branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can upload app branding"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'app-branding'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Anyone can view app branding"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'app-branding');

CREATE POLICY "Admins can update app branding"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'app-branding'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete app branding"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'app-branding'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );
