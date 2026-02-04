-- Set is_admin = true for the profile. RLS checks: profiles.user_id = auth.uid() AND is_admin = true.
-- If 315f30d1-... is your Auth user id (from Authentication > Users), this is correct.
-- If 315f30d1-... is your profile row's "id" (PK), run instead:
--   UPDATE public.profiles SET is_admin = true WHERE id = '315f30d1-3a5f-4929-92d9-e47183b15d05';
UPDATE public.profiles
SET is_admin = true
WHERE user_id = '315f30d1-3a5f-4929-92d9-e47183b15d05';
