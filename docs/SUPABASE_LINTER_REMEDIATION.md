# Supabase performance and security linter – remediation

Migrations were added to fix most issues reported by the Supabase Database Linter. This doc covers what was done and the one item you must enable in the Dashboard.

## Applied via migrations

1. **Auth RLS Initialization Plan (performance)** – All RLS policies that used `auth.uid()` were updated to use `(select auth.uid())` so the value is not re-evaluated per row. Migration: `20260225000000_rls_auth_init_plan_performance.sql`.

2. **Multiple permissive policies (performance)** – On `feature_requests` (UPDATE) and `feedback` (SELECT, UPDATE), the two permissive policies per action were replaced by a single policy per action (user OR admin). Same migration as above.

3. **Unindexed foreign keys (performance)** – Indexes were added on all reported foreign key columns. Migration: `20260225000001_unindexed_fks_and_security.sql`.

4. **RLS enabled, no policy – `rate_limits`** – An explicit “no direct access” policy was added so only the service role (which bypasses RLS) can access the table. Same migration as (3).

5. **Function search_path mutable (security)** – `public.update_feature_requests_updated_at()` was recreated with `SET search_path = public`. Same migration as (3).

## You need to do in the Dashboard

- **Leaked password protection (security)** – Supabase Auth can check passwords against HaveIBeenPwned. Enable it in the Dashboard: **Authentication → Settings** (or **Auth → Providers → Email**) and turn on **“Leaked password protection”** (or “Check passwords against HaveIBeenPwned”).  
  See: [Password strength and leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Not changed (by design)

- **Unused indexes (INFO)** – The linter reported some indexes as “never used” (e.g. `idx_tasks_status`, `notifications_user_id_idx`). These were left in place; they may be used by future queries or by the app in ways the linter doesn’t see. You can drop them later if you confirm they’re unused.
