-- Supabase Linter: Unindexed foreign keys (PERFORMANCE)
-- Add indexes on FK columns to avoid full table scans on joins/deletes.
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

CREATE INDEX IF NOT EXISTS idx_feature_requests_user_id ON public.feature_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_project_statuses_project_id ON public.project_statuses(project_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_review_file_id ON public.review_comments(review_file_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_review_request_id ON public.review_comments(review_request_id);
CREATE INDEX IF NOT EXISTS idx_review_files_review_request_id ON public.review_files(review_request_id);
CREATE INDEX IF NOT EXISTS idx_review_recipients_review_request_id ON public.review_recipients(review_request_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_client_id ON public.review_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_folder_id ON public.review_requests(folder_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_project_id ON public.review_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_id ON public.tasks(status_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON public.time_entries(task_id);

-- ========== Security: rate_limits has RLS but no policy (INFO) ==========
-- Explicit "no access" for anon/authenticated; only service role (bypasses RLS) can access.
DROP POLICY IF EXISTS "No direct access to rate_limits" ON public.rate_limits;
CREATE POLICY "No direct access to rate_limits" ON public.rate_limits FOR ALL USING (false);

-- ========== Security: Function search_path (WARN) ==========
-- Prevent search_path injection. See: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
CREATE OR REPLACE FUNCTION public.update_feature_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
