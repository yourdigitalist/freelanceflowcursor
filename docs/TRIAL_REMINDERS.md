# Trial reminder emails

The `send-trial-reminders` Edge Function sends emails to users when their trial has **5 days left** or **1 day left**.

- **Requires:** `RESEND_API_KEY` in Supabase Edge Function secrets.
- **Invoke:** Run once per day (e.g. 9:00 AM) via cron:
  - `POST https://<your-project-ref>.supabase.co/functions/v1/send-trial-reminders`
  - Header: `Authorization: Bearer <your-anon-key>`
  - Header: `Content-Type: application/json`

In-app reminders (trial banner and sidebar badge) are always shown for trial users; no cron needed.
