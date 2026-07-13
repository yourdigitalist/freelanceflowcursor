# Automatic client invoice reminders

## Daily cron job

The `send-invoice-reminders` Edge Function runs daily via **pg_cron** at **08:30 UTC** (migration `20260710120100_send_invoice_reminders_cron.sql`, repair `20260713150000_repair_send_invoice_reminders_cron.sql`).

It uses the **same Vault secrets** as deadline notifications:

- `notifications_project_url`
- `notifications_cron_key`

And the same Edge Function secret: **`NOTIFICATIONS_CRON_KEY`**.

### One-time setup

1. Enable **pg_cron** and **pg_net** (Database → Extensions).
2. Apply migrations: `supabase db push`
3. Ensure **`NOTIFICATIONS_CRON_KEY`** is set on Edge Functions (must match Vault `notifications_cron_key`).
4. Deploy: `supabase functions deploy send-invoice-reminders`

### Verify cron job exists

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'send-invoice-reminders-daily';
```

### Manual test (admin)

**Admin → System check → Run invoice reminders now**

Or curl:

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-invoice-reminders" \
  -H "Authorization: Bearer YOUR_NOTIFICATIONS_CRON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Success response: `{"ok":true,"sent":N,"skipped":N,"profiles_checked":N,"errors":[]}`

### When reminders send

Per user with **Settings → Invoices → automatic reminders enabled**:

- Invoice status is `sent` or `overdue`
- `due_date` = **today + reminder_days_before** (e.g. 2 days before due → cron on Monday reminds invoices due Wednesday)
- Client has an email address

After send: status becomes **`reminder_sent`**, `last_reminder_sent_at` is set, `last_reminder_automatic = true`.

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| Invoices stay `sent` | Cron not running, reminders disabled, due date mismatch, or no client email |
| `Unauthorized` on manual test | Rotate `NOTIFICATIONS_CRON_KEY` and `vault.update_secret` for `notifications_cron_key` to match |
| Cron job missing | Run `supabase db push` or repair migration SQL in SQL Editor |
| Function 404 | `supabase functions deploy send-invoice-reminders` |
