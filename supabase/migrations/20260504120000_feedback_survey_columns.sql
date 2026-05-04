-- Survey fields for in-app feedback tab (extends legacy message/context rows)
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS freelance_area TEXT,
  ADD COLUMN IF NOT EXISTS first_feature TEXT,
  ADD COLUMN IF NOT EXISTS what_broke TEXT,
  ADD COLUMN IF NOT EXISTS wish_list TEXT,
  ADD COLUMN IF NOT EXISTS impression SMALLINT;

COMMENT ON COLUMN public.feedback.freelance_area IS 'Survey: main freelance area';
COMMENT ON COLUMN public.feedback.first_feature IS 'Survey: first feature tried';
COMMENT ON COLUMN public.feedback.what_broke IS 'Survey: confusing or broken';
COMMENT ON COLUMN public.feedback.wish_list IS 'Survey: feature wish';
COMMENT ON COLUMN public.feedback.impression IS 'Survey: first impression 1-5';

-- Help page inserts message-only; tab inserts what_broke (+ optional fields).
ALTER TABLE public.feedback ALTER COLUMN message DROP NOT NULL;

ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_message_or_what_broke_check;

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_message_or_what_broke_check CHECK (
    (message IS NOT NULL AND length(trim(message)) > 0)
    OR (what_broke IS NOT NULL AND length(trim(what_broke)) > 0)
  );
