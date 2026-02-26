-- Supabase Linter: Auth RLS Initialization Plan (PERFORMANCE)
-- Replace auth.uid() with (select auth.uid()) in RLS policies so they are not re-evaluated per row.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ========== profiles ==========
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((select auth.uid()) = user_id);

-- ========== clients ==========
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
CREATE POLICY "Users can insert their own clients" ON public.clients FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING ((select auth.uid()) = user_id);

-- ========== projects ==========
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view their own projects" ON public.projects FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
CREATE POLICY "Users can insert their own projects" ON public.projects FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING ((select auth.uid()) = user_id);

-- ========== tasks ==========
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
CREATE POLICY "Users can view their own tasks" ON public.tasks FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
CREATE POLICY "Users can insert their own tasks" ON public.tasks FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
CREATE POLICY "Users can update their own tasks" ON public.tasks FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
CREATE POLICY "Users can delete their own tasks" ON public.tasks FOR DELETE USING ((select auth.uid()) = user_id);

-- ========== time_entries ==========
DROP POLICY IF EXISTS "Users can view their own time entries" ON public.time_entries;
CREATE POLICY "Users can view their own time entries" ON public.time_entries FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own time entries" ON public.time_entries;
CREATE POLICY "Users can insert their own time entries" ON public.time_entries FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own time entries" ON public.time_entries;
CREATE POLICY "Users can update their own time entries" ON public.time_entries FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own time entries" ON public.time_entries;
CREATE POLICY "Users can delete their own time entries" ON public.time_entries FOR DELETE USING ((select auth.uid()) = user_id);

-- ========== invoices ==========
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
CREATE POLICY "Users can view their own invoices" ON public.invoices FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.invoices;
CREATE POLICY "Users can insert their own invoices" ON public.invoices FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
CREATE POLICY "Users can update their own invoices" ON public.invoices FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;
CREATE POLICY "Users can delete their own invoices" ON public.invoices FOR DELETE USING ((select auth.uid()) = user_id);

-- ========== invoice_items ==========
DROP POLICY IF EXISTS "Users can view their own invoice items" ON public.invoice_items;
CREATE POLICY "Users can view their own invoice items" ON public.invoice_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND user_id = (select auth.uid())));
DROP POLICY IF EXISTS "Users can insert their own invoice items" ON public.invoice_items;
CREATE POLICY "Users can insert their own invoice items" ON public.invoice_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND user_id = (select auth.uid())));
DROP POLICY IF EXISTS "Users can update their own invoice items" ON public.invoice_items;
CREATE POLICY "Users can update their own invoice items" ON public.invoice_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND user_id = (select auth.uid())));
DROP POLICY IF EXISTS "Users can delete their own invoice items" ON public.invoice_items;
CREATE POLICY "Users can delete their own invoice items" ON public.invoice_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_id AND user_id = (select auth.uid())));

-- ========== taxes ==========
DROP POLICY IF EXISTS "Users can view their own taxes" ON public.taxes;
CREATE POLICY "Users can view their own taxes" ON public.taxes FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own taxes" ON public.taxes;
CREATE POLICY "Users can insert their own taxes" ON public.taxes FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own taxes" ON public.taxes;
CREATE POLICY "Users can update their own taxes" ON public.taxes FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own taxes" ON public.taxes;
CREATE POLICY "Users can delete their own taxes" ON public.taxes FOR DELETE USING ((select auth.uid()) = user_id);

-- ========== review_folders ==========
DROP POLICY IF EXISTS "Users can view their own folders" ON public.review_folders;
CREATE POLICY "Users can view their own folders" ON public.review_folders FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own folders" ON public.review_folders;
CREATE POLICY "Users can insert their own folders" ON public.review_folders FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own folders" ON public.review_folders;
CREATE POLICY "Users can update their own folders" ON public.review_folders FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own folders" ON public.review_folders;
CREATE POLICY "Users can delete their own folders" ON public.review_folders FOR DELETE USING ((select auth.uid()) = user_id);

-- ========== review_requests ==========
DROP POLICY IF EXISTS "Users can view their own requests" ON public.review_requests;
CREATE POLICY "Users can view their own requests" ON public.review_requests FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own requests" ON public.review_requests;
CREATE POLICY "Users can insert their own requests" ON public.review_requests FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own requests" ON public.review_requests;
CREATE POLICY "Users can update their own requests" ON public.review_requests FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own requests" ON public.review_requests;
CREATE POLICY "Users can delete their own requests" ON public.review_requests FOR DELETE USING ((select auth.uid()) = user_id);

-- ========== review_files ==========
DROP POLICY IF EXISTS "Users can view their own files" ON public.review_files;
CREATE POLICY "Users can view their own files" ON public.review_files FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own files" ON public.review_files;
CREATE POLICY "Users can insert their own files" ON public.review_files FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own files" ON public.review_files;
CREATE POLICY "Users can delete their own files" ON public.review_files FOR DELETE USING ((select auth.uid()) = user_id);

-- ========== review_comments ==========
DROP POLICY IF EXISTS "Users can view comments on their requests" ON public.review_comments;
CREATE POLICY "Users can view comments on their requests" ON public.review_comments FOR SELECT USING (EXISTS (SELECT 1 FROM public.review_requests WHERE id = review_request_id AND user_id = (select auth.uid())));
DROP POLICY IF EXISTS "Users can delete comments on their requests" ON public.review_comments;
CREATE POLICY "Users can delete comments on their requests" ON public.review_comments FOR DELETE USING (EXISTS (SELECT 1 FROM public.review_requests WHERE id = review_request_id AND user_id = (select auth.uid())));

-- ========== review_recipients ==========
DROP POLICY IF EXISTS "Users can manage recipients for their requests" ON public.review_recipients;
CREATE POLICY "Users can manage recipients for their requests" ON public.review_recipients FOR ALL USING (EXISTS (SELECT 1 FROM public.review_requests WHERE id = review_request_id AND user_id = (select auth.uid())));

-- ========== project_statuses ==========
DROP POLICY IF EXISTS "Users can view their own project statuses" ON public.project_statuses;
CREATE POLICY "Users can view their own project statuses" ON public.project_statuses FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own project statuses" ON public.project_statuses;
CREATE POLICY "Users can insert their own project statuses" ON public.project_statuses FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own project statuses" ON public.project_statuses;
CREATE POLICY "Users can update their own project statuses" ON public.project_statuses FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own project statuses" ON public.project_statuses;
CREATE POLICY "Users can delete their own project statuses" ON public.project_statuses FOR DELETE USING ((select auth.uid()) = user_id);

-- ========== task_comments ==========
DROP POLICY IF EXISTS "Users can view comments on their tasks" ON public.task_comments;
CREATE POLICY "Users can view comments on their tasks" ON public.task_comments FOR SELECT USING (EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_comments.task_id AND tasks.user_id = (select auth.uid())));
DROP POLICY IF EXISTS "Users can insert comments on their tasks" ON public.task_comments;
CREATE POLICY "Users can insert comments on their tasks" ON public.task_comments FOR INSERT WITH CHECK ((select auth.uid()) = user_id AND EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_comments.task_id AND tasks.user_id = (select auth.uid())));
DROP POLICY IF EXISTS "Users can update their own comments" ON public.task_comments;
CREATE POLICY "Users can update their own comments" ON public.task_comments FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.task_comments;
CREATE POLICY "Users can delete their own comments" ON public.task_comments FOR DELETE USING ((select auth.uid()) = user_id);

-- ========== notifications ==========
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update own notifications (mark read)" ON public.notifications;
CREATE POLICY "Users can update own notifications (mark read)" ON public.notifications FOR UPDATE USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING ((select auth.uid()) = user_id);

-- ========== help_content ==========
DROP POLICY IF EXISTS "Admins can insert help_content" ON public.help_content;
CREATE POLICY "Admins can insert help_content" ON public.help_content FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = (select auth.uid()) AND is_admin = true));
DROP POLICY IF EXISTS "Admins can update help_content" ON public.help_content;
CREATE POLICY "Admins can update help_content" ON public.help_content FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = (select auth.uid()) AND is_admin = true));
DROP POLICY IF EXISTS "Admins can delete help_content" ON public.help_content;
CREATE POLICY "Admins can delete help_content" ON public.help_content FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = (select auth.uid()) AND is_admin = true));

-- ========== feature_requests ==========
DROP POLICY IF EXISTS "Authenticated users can insert own feature_requests" ON public.feature_requests;
CREATE POLICY "Authenticated users can insert own feature_requests" ON public.feature_requests FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
-- UPDATE: single policy for user-or-admin (fixes multiple_permissive)
DROP POLICY IF EXISTS "Users can update own feature_request" ON public.feature_requests;
DROP POLICY IF EXISTS "Admins can update any feature_request" ON public.feature_requests;
DROP POLICY IF EXISTS "Users or admins can update feature_request" ON public.feature_requests;
CREATE POLICY "Users or admins can update feature_request" ON public.feature_requests FOR UPDATE USING (
  (select auth.uid()) = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = (select auth.uid()) AND is_admin = true)
);

-- ========== feedback ==========
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.feedback;
CREATE POLICY "Users can insert own feedback" ON public.feedback FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
-- SELECT: single policy for user-or-admin (fixes multiple_permissive)
DROP POLICY IF EXISTS "Users can read own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins can read all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users or admins can read feedback" ON public.feedback;
CREATE POLICY "Users or admins can read feedback" ON public.feedback FOR SELECT USING (
  (select auth.uid()) = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = (select auth.uid()) AND is_admin = true)
);
DROP POLICY IF EXISTS "Users can update own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins can update any feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users or admins can update feedback" ON public.feedback;
CREATE POLICY "Users or admins can update feedback" ON public.feedback FOR UPDATE USING (
  (select auth.uid()) = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = (select auth.uid()) AND is_admin = true)
);

-- ========== feature_request_votes ==========
DROP POLICY IF EXISTS "Users can insert own vote" ON public.feature_request_votes;
CREATE POLICY "Users can insert own vote" ON public.feature_request_votes FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete own vote" ON public.feature_request_votes;
CREATE POLICY "Users can delete own vote" ON public.feature_request_votes FOR DELETE USING ((select auth.uid()) = user_id);

-- ========== time_entry_segments ==========
DROP POLICY IF EXISTS "Users can view segments of own time entries" ON public.time_entry_segments;
CREATE POLICY "Users can view segments of own time entries" ON public.time_entry_segments FOR SELECT USING (EXISTS (SELECT 1 FROM public.time_entries te WHERE te.id = time_entry_segments.time_entry_id AND te.user_id = (select auth.uid())));
DROP POLICY IF EXISTS "Users can insert segments for own time entries" ON public.time_entry_segments;
CREATE POLICY "Users can insert segments for own time entries" ON public.time_entry_segments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.time_entries te WHERE te.id = time_entry_segments.time_entry_id AND te.user_id = (select auth.uid())));
DROP POLICY IF EXISTS "Users can update segments of own time entries" ON public.time_entry_segments;
CREATE POLICY "Users can update segments of own time entries" ON public.time_entry_segments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.time_entries te WHERE te.id = time_entry_segments.time_entry_id AND te.user_id = (select auth.uid())));
DROP POLICY IF EXISTS "Users can delete segments of own time entries" ON public.time_entry_segments;
CREATE POLICY "Users can delete segments of own time entries" ON public.time_entry_segments FOR DELETE USING (EXISTS (SELECT 1 FROM public.time_entries te WHERE te.id = time_entry_segments.time_entry_id AND te.user_id = (select auth.uid())));

-- ========== app_branding ==========
DROP POLICY IF EXISTS "Admins can update app_branding" ON public.app_branding;
CREATE POLICY "Admins can update app_branding" ON public.app_branding FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = (select auth.uid()) AND is_admin = true));
DROP POLICY IF EXISTS "Admins can insert app_branding" ON public.app_branding;
CREATE POLICY "Admins can insert app_branding" ON public.app_branding FOR INSERT WITH CHECK (id = 1 AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = (select auth.uid()) AND is_admin = true));

-- ========== app_comms_defaults ==========
DROP POLICY IF EXISTS "Admins can update app_comms_defaults" ON public.app_comms_defaults;
CREATE POLICY "Admins can update app_comms_defaults" ON public.app_comms_defaults FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = (select auth.uid()) AND is_admin = true));
DROP POLICY IF EXISTS "Admins can insert app_comms_defaults" ON public.app_comms_defaults;
CREATE POLICY "Admins can insert app_comms_defaults" ON public.app_comms_defaults FOR INSERT WITH CHECK (id = 1 AND EXISTS (SELECT 1 FROM public.profiles WHERE user_id = (select auth.uid()) AND is_admin = true));
