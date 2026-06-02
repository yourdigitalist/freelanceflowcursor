-- One-off backfill: run in Supabase Dashboard → SQL Editor if `supabase db push` fails
-- (same logic as migration 20260601120000_backfill_tasks_default_status.sql)

UPDATE public.tasks AS t
SET status_id = pick.default_id
FROM (
  SELECT
    tk.id AS task_id,
    COALESCE(
      (
        SELECT ps.id
        FROM public.project_statuses ps
        WHERE ps.project_id = tk.project_id
          AND ps.name = 'Haven''t Started'
        LIMIT 1
      ),
      (
        SELECT ps.id
        FROM public.project_statuses ps
        WHERE ps.project_id = tk.project_id
          AND NOT ps.is_done_status
        ORDER BY ps.position
        LIMIT 1
      ),
      (
        SELECT ps.id
        FROM public.project_statuses ps
        WHERE ps.project_id = tk.project_id
        ORDER BY ps.position
        LIMIT 1
      )
    ) AS default_id
  FROM public.tasks AS tk
  WHERE tk.status_id IS NULL
) AS pick
WHERE t.id = pick.task_id
  AND pick.default_id IS NOT NULL;
