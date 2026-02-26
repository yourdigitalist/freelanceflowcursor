-- Assign a slot directly to a file in the app-icons bucket (no app_icon_uploads row needed)
ALTER TABLE public.app_icon_slots
  ADD COLUMN IF NOT EXISTS icon_storage_path TEXT;

COMMENT ON COLUMN public.app_icon_slots.icon_storage_path IS 'Path in app-icons bucket, e.g. uploads/icon.svg. Used when icons are managed only in Storage.';
