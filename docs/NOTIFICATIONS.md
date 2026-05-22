# In-app and email notifications

## Daily deadline job (Supabase Cron)

The `send-deadline-notifications` Edge Function runs daily via **pg_cron** (migration `20260522100000_send_deadline_notifications_cron.sql`).

### One-time setup

1. Enable **pg_cron** and **pg_net** in Supabase Dashboard → Database → Extensions.
2. Apply migrations (or run the migration SQL in SQL Editor).
3. Create a random cron key and set it as Edge Function secret **`NOTIFICATIONS_CRON_KEY`**.
4. Add Vault secrets (SQL Editor):

```sql
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'notifications_project_url');
select vault.create_secret('YOUR_NOTIFICATIONS_CRON_KEY', 'notifications_cron_key');
```

5. Deploy the function: `supabase functions deploy send-deadline-notifications`

### Manual test

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-deadline-notifications" \
  -H "Authorization: Bearer YOUR_NOTIFICATIONS_CRON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response includes `notifications_built` and `notifications_upserted`.

### Verify cron job

```sql
select jobid, jobname, schedule, active from cron.job where jobname = 'send-deadline-notifications-daily';
```

## Event-driven in-app notifications

| Event | Function |
|-------|----------|
| Approval comment | `submit-review-comment` |
| Approval approved/rejected | `update-review-status` |
| Proposal viewed (first time) | `view-proposal` |
| Proposal accepted | `accept-proposal` |
| Contract freelancer/client/both signed | `verify-contract-otp` |
| Contract cancelled | `cancel-contract` |

Preferences live in `profiles.notification_preferences` (Settings → Notifications).

## Troubleshooting

- **Empty `/notifications` page**: Check `notifications` table for your `user_id`. If empty, cron may not be scheduled or secrets missing.
- **Upsert failures**: Ensure migration `20260409112000_notifications_event_key_and_dedupe.sql` is applied (`event_key` column + unique index).
- **Realtime badge**: Requires visiting the app while logged in; badge refreshes on new rows if Realtime is enabled for `notifications`.
