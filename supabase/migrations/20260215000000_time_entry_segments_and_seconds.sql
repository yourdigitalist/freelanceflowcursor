-- Time tracking: segments (multiple start/end per entry) and duration in seconds.
-- Keeps time_entries compatible with invoicing: total_duration_seconds and trigger-updated duration_minutes/start_time/end_time.

-- 1. Add total_duration_seconds and started_at to time_entries (for display and invoice)
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS total_duration_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

UPDATE public.time_entries
SET
  total_duration_seconds = COALESCE(duration_minutes, 0) * 60,
  started_at = start_time
WHERE total_duration_seconds IS NULL OR total_duration_seconds = 0;

-- 2. Create time_entry_segments for multiple start/end per entry
CREATE TABLE IF NOT EXISTS public.time_entry_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_entry_segments_time_entry_id ON public.time_entry_segments(time_entry_id);

ALTER TABLE public.time_entry_segments ENABLE ROW LEVEL SECURITY;

-- RLS: user can only access segments for their own time entries
CREATE POLICY "Users can view segments of own time entries"
  ON public.time_entry_segments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.time_entries te
      WHERE te.id = time_entry_segments.time_entry_id AND te.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert segments for own time entries"
  ON public.time_entry_segments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.time_entries te
      WHERE te.id = time_entry_segments.time_entry_id AND te.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update segments of own time entries"
  ON public.time_entry_segments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.time_entries te
      WHERE te.id = time_entry_segments.time_entry_id AND te.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete segments of own time entries"
  ON public.time_entry_segments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.time_entries te
      WHERE te.id = time_entry_segments.time_entry_id AND te.user_id = auth.uid()
    )
  );

-- 3. Trigger: when segments change, sync time_entries (total_duration_seconds, started_at, start_time, end_time, duration_minutes)
CREATE OR REPLACE FUNCTION public.sync_time_entry_from_segments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entry_id UUID;
  seg_count INT;
BEGIN
  entry_id := COALESCE(NEW.time_entry_id, OLD.time_entry_id);
  IF entry_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COUNT(*) INTO seg_count FROM public.time_entry_segments WHERE time_entry_id = entry_id;

  IF seg_count = 0 THEN
    UPDATE public.time_entries
    SET total_duration_seconds = 0, duration_minutes = 0, updated_at = now()
    WHERE id = entry_id;
  ELSE
    UPDATE public.time_entries
    SET
      total_duration_seconds = (SELECT COALESCE(SUM(duration_seconds), 0)::INT FROM public.time_entry_segments WHERE time_entry_id = entry_id),
      started_at = (SELECT MIN(start_time) FROM public.time_entry_segments WHERE time_entry_id = entry_id),
      start_time = (SELECT MIN(start_time) FROM public.time_entry_segments WHERE time_entry_id = entry_id),
      end_time = (SELECT MAX(end_time) FROM public.time_entry_segments WHERE time_entry_id = entry_id),
      duration_minutes = (SELECT ROUND(COALESCE(SUM(duration_seconds), 0) / 60.0)::INT FROM public.time_entry_segments WHERE time_entry_id = entry_id),
      updated_at = now()
    WHERE id = entry_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_time_entry_from_segments_trigger ON public.time_entry_segments;
CREATE TRIGGER sync_time_entry_from_segments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.time_entry_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_time_entry_from_segments();
