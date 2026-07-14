-- App-wide feature access toggles (single-row config)
CREATE TABLE IF NOT EXISTS public.app_features (
  id INT PRIMARY KEY DEFAULT 1,
  notes_access_mode TEXT NOT NULL DEFAULT 'admin',
  contracts_access_mode TEXT NOT NULL DEFAULT 'admin',
  proposals2_access_mode TEXT NOT NULL DEFAULT 'off',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1),
  CONSTRAINT notes_access_mode_check CHECK (notes_access_mode IN ('off', 'admin', 'on')),
  CONSTRAINT contracts_access_mode_check CHECK (contracts_access_mode IN ('off', 'admin', 'on')),
  CONSTRAINT proposals2_access_mode_check CHECK (proposals2_access_mode IN ('off', 'admin', 'on'))
);

INSERT INTO public.app_features (id, notes_access_mode, contracts_access_mode, proposals2_access_mode, updated_at)
VALUES (1, 'admin', 'admin', 'off', now())
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_features"
  ON public.app_features FOR SELECT
  USING (true);

CREATE POLICY "Admins can update app_features"
  ON public.app_features FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can insert app_features"
  ON public.app_features FOR INSERT
  WITH CHECK (
    id = 1 AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

COMMENT ON TABLE public.app_features IS 'App-wide feature access: off, admin (admins only), on (all users).';
