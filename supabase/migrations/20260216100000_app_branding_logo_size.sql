-- Add sidebar logo size option: sm | md | lg (applies to collapsed icon only)
ALTER TABLE public.app_branding
  ADD COLUMN IF NOT EXISTS logo_size TEXT DEFAULT 'md';

-- Logo (expanded): height 100%, width in pixels (default 120 = current common width)
ALTER TABLE public.app_branding
  ADD COLUMN IF NOT EXISTS logo_width INT DEFAULT 120;
