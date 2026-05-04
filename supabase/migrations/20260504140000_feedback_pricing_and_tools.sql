ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS pricing_feel TEXT,
  ADD COLUMN IF NOT EXISTS current_tools JSONB;

COMMENT ON COLUMN public.feedback.pricing_feel IS 'Survey: pricing perception';
COMMENT ON COLUMN public.feedback.current_tools IS 'Survey: { "selected": string[], "other": string | null }';
