-- Pause already inserts a segment; Save used to re-insert the same range when
-- string-matching start_time failed ("Z" vs "+00:00"). Remove duplicates and
-- prevent them at the DB level.
-- Keep the longest segment when the same start_time was saved more than once
-- (identical copies, or a short pause followed by a longer re-save).

DELETE FROM public.time_entry_segments
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY time_entry_id, start_time
        ORDER BY duration_seconds DESC, end_time DESC, id ASC
      ) AS rn
    FROM public.time_entry_segments
  ) ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS time_entry_segments_entry_start_uidx
  ON public.time_entry_segments (time_entry_id, start_time);
