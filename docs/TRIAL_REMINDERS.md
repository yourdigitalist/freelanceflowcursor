# Trial reminder emails

The `send-trial-reminders` Edge Function sends emails when a user's trial has **5 days left**, **1 day left**, or **ends today** (0 days).

- **Requires:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL` in Supabase Edge Function secrets.
- **Invoke:** Run once per day (e.g. 9:00 AM) via cron:
  - `POST https://<your-project-ref>.supabase.co/functions/v1/send-trial-reminders`
  - Header: `Authorization: Bearer <TRIAL_REMINDERS_CRON_KEY>`
  - Header: `Content-Type: application/json`

In-app reminders (trial banner and sidebar) are always shown for trial users; no cron needed.

---

## Auth / security

This endpoint is **not** meant to be publicly callable. It requires either:

- A cron key you set as an Edge Function secret: `TRIAL_REMINDERS_CRON_KEY`, **or**
- An authenticated **admin** user's JWT (checked via `profiles.is_admin`).

Recommended setup: use `TRIAL_REMINDERS_CRON_KEY` and a scheduled job.

---

## Test mode (recommended for deliverability checks)

To test inbox placement without changing production trial dates, you can send a single test email:

- `POST https://<your-project-ref>.supabase.co/functions/v1/send-trial-reminders`
- Headers:
  - `Authorization: Bearer <TRIAL_REMINDERS_CRON_KEY>`
  - `Content-Type: application/json`
- Body:
  - `{ "testEmail": "you@example.com", "testDaysLeft": 5, "testName": "Marina" }`

## Who receives reminder emails?

Only users who have **both**:

1. `subscription_status = 'trial'`
2. `trial_end_date` set (not null)

The function queries `profiles` with `subscription_status = 'trial'` and `trial_end_date IS NOT NULL`. If `trial_end_date` is null, that user is **not** included and will not get any reminder emails.

### Why didn’t I get a reminder?

Common reasons:

1. **Cron not set up** – The function must be invoked (e.g. daily). If nothing calls it, no emails are sent. Set up a cron job or Supabase scheduled invocation to run it once per day.
2. **`trial_end_date` is null** – Accounts created manually or before the formal signup/onboarding flow may have `subscription_status = 'trial'` but no `trial_end_date`. Those users are skipped. To fix: set `trial_end_date` (and optionally `trial_start_date`) for those profiles in the database, e.g.:
   - In Supabase Dashboard → Table Editor → `profiles`: edit the row and set `trial_end_date` to the desired end date (e.g. 15 days after signup or a fixed date).
   - Or run a one-off SQL update for existing trial users who are missing the date.

After `trial_end_date` is set, the next time the cron runs and the “days left” matches 5, 1, or 0, that user will receive the corresponding email.
