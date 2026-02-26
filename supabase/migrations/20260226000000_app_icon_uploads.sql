-- Uploaded icons (admin uploads SVG; name shown in dropdown)
CREATE TABLE IF NOT EXISTS public.app_icon_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  svg_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Which uploaded icon is used for each slot (null = use default)
CREATE TABLE IF NOT EXISTS public.app_icon_slots (
  slot_key TEXT PRIMARY KEY,
  icon_upload_id UUID REFERENCES public.app_icon_uploads(id) ON DELETE SET NULL
);

ALTER TABLE public.app_icon_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_icon_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app_icon_uploads" ON public.app_icon_uploads;
CREATE POLICY "Anyone can read app_icon_uploads"
  ON public.app_icon_uploads FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert app_icon_uploads" ON public.app_icon_uploads;
CREATE POLICY "Admins can insert app_icon_uploads"
  ON public.app_icon_uploads FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update app_icon_uploads" ON public.app_icon_uploads;
CREATE POLICY "Admins can update app_icon_uploads"
  ON public.app_icon_uploads FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete app_icon_uploads" ON public.app_icon_uploads;
CREATE POLICY "Admins can delete app_icon_uploads"
  ON public.app_icon_uploads FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Anyone can read app_icon_slots" ON public.app_icon_slots;
CREATE POLICY "Anyone can read app_icon_slots"
  ON public.app_icon_slots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert app_icon_slots" ON public.app_icon_slots;
CREATE POLICY "Admins can insert app_icon_slots"
  ON public.app_icon_slots FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can update app_icon_slots" ON public.app_icon_slots;
CREATE POLICY "Admins can update app_icon_slots"
  ON public.app_icon_slots FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Admins can delete app_icon_slots" ON public.app_icon_slots;
CREATE POLICY "Admins can delete app_icon_slots"
  ON public.app_icon_slots FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true));
