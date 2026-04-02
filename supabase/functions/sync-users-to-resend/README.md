# sync-users-to-resend

Syncs Supabase `profiles` to Resend contacts and segments for marketing. Contacts and segments appear in your Resend dashboard; use segments there to target broadcasts (e.g. Trial, Trial Ending Soon, Paid).

## 1. Deploy and see contacts in Resend

### Deploy the function

```bash
supabase functions deploy sync-users-to-resend
```

### Set the Resend API key

In Supabase Dashboard: **Project Settings → Edge Functions → Secrets**, add:

- `RESEND_API_KEY` = your Resend API key (from [Resend Dashboard → API Keys](https://resend.com/api-keys))

Set **RESEND_SYNC_CRON_KEY** in Edge Function secrets to your Supabase **service role key** (Project Settings → API). The function uses it to allow full sync when you call with that key (curl or hourly cron). Other env vars are set automatically.

### Run the first full sync (backfill)

So contacts and segments show up in Resend right away, run a **full sync** once. Either:

**Option A – From your app (as admin)**  
As a logged-in admin user, POST to the function with no body:

```bash
curl -X POST "https://mtgocbkjrfpffzjkhmox.supabase.co/functions/v1/sync-users-to-resend" \
  -H "Authorization: Bearer YOUR_ADMIN_USER_JWT" \
  -H "Content-Type: application/json"
```

Get `YOUR_ADMIN_USER_JWT` from your app (e.g. after signing in as admin, copy the session’s access token from the browser/DevTools or from `supabase.auth.getSession()`).

**Option B – With RESEND_SYNC_CRON_KEY (same value as service role key)**  
Full sync is allowed when the `Authorization` header is `Bearer <your RESEND_SYNC_CRON_KEY value>` (no body):

```bash
curl -X POST "https://mtgocbkjrfpffzjkhmox.supabase.co/functions/v1/sync-users-to-resend" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Use the same value you set for **RESEND_SYNC_CRON_KEY** in Edge Function secrets (your service role key). Keep it secret.

After a successful run you should see:

- **Resend Dashboard → Contacts**: one contact per profile with an email  
- **Resend Dashboard → Audiences/Segments**: segments like All Users, Trial, Paid, Onboarded, etc.

---

## 2. Keep Resend in sync (regular updates)

Sync runs automatically in two ways:

1. **Per user** – When a user signs up they’re synced on the Onboarding page; when they change “Marketing” in Notification settings, that user is synced again.
2. **Full sync on a schedule** – So segments stay correct (e.g. trial → paid, onboarding completed), run a full sync regularly.

### Scheduled full sync (recommended)

A migration is provided that schedules an **hourly** full sync using Supabase pg_cron + pg_net.

**Step 1 – Enable extensions**  
In Supabase Dashboard: **Database → Extensions**. Enable:

- `pg_cron`
- `pg_net`

**Step 2 – Store secrets in Vault**  
The cron job looks up two secrets **by name**. You create each secret with: **value first, name second** in `vault.create_secret(value, name)`.

In **SQL Editor**, run these two statements (paste your real **service role key** from Supabase **Project Settings → API** where indicated):

```sql
-- 1) Project URL – name is 'sync_resend_project_url', value is your Supabase project URL
SELECT vault.create_secret('https://mtgocbkjrfpffzjkhmox.supabase.co', 'sync_resend_project_url');

-- 2) Service role key – name is 'sync_resend_service_role_key', value is the key from Project Settings → API (service_role)
SELECT vault.create_secret('PASTE_YOUR_SERVICE_ROLE_KEY_HERE', 'sync_resend_service_role_key');
```

The migration then looks up by **name** (`sync_resend_project_url` and `sync_resend_service_role_key`) to get the values. If a secret with that name already exists, delete it in the Vault UI or use a different name and update the migration to match.

**Step 3 – Run the migration**

```bash
supabase db push
```

Or in **SQL Editor**, run the contents of `supabase/migrations/20260320000000_sync_users_to_resend_cron.sql` manually.

The migration removes any existing `sync-users-to-resend-hourly` job and creates a new one that looks up the two secrets by name. **If you already ran an older version of this migration**, run it again (or run the migration file in SQL Editor) so the cron job uses the correct vault names.

After that, the function is invoked every hour with the service role key and performs a full sync, so Resend contacts and segment membership stay up to date for campaigns.

To change the schedule (e.g. every 6 hours), edit the cron expression in that migration (`0 * * * *` = every hour) and re-run or update the job in **Database → Cron** in the Dashboard.

---

## Segments

The function uses **3 segments** (Resend plan limit). Resend’s default **General** segment is used as **All Users** so we only create **Trial** and **Paid** when missing. If **Paid** doesn’t appear, in Resend delete the extra **All Users** segment (keep **General**) so a slot is free; the next sync will create **Paid**.

| Segment     | Who is included                              |
|------------|-----------------------------------------------|
| All Users  | Every profile (uses **General** if present)   |
| Trial      | `subscription_status = 'trial'`               |
| Paid       | Active subscription or plan pro/team          |

Unsubscribes are respected: when a user turns off “Product updates and tips” in Notification settings (or via Resend’s unsubscribe link), their contact is updated so they don’t receive marketing broadcasts.

---

## API summary

- **Single-user sync**  
  `POST` with body `{ "user_id": "<uuid>" }` and that user’s JWT.  
  Used by the app after signup and when saving Notification settings.

- **Full sync**  
  `POST` with no body (or `{}`) and either an **admin user JWT** or **Bearer RESEND_SYNC_CRON_KEY** (same as service role key).  
  Used for backfill and by the hourly cron.
