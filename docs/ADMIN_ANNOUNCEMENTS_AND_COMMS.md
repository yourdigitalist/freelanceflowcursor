# Admin: Announcements, Comms Templates, and Usage Dashboard

This doc outlines how to add three admin features: (1) send in-app + email announcements to users, (2) edit all comms templates and notification copy globally, and (3) a simple usage dashboard (active users, etc.).

---

## 1. Send announcements (in-app + email) to all active users

**What you want:** As app admin, compose a message (e.g. new feature or announcement) and send it to everyone with an “active” account—both as an in-app notification and by email.

**Feasibility:** Straightforward. You already have:
- `notifications` table (in-app: title, body, link, per user).
- User emails and profiles (for “active” filter and email delivery).

**What to add:**

- **Define “active account”**  
  Examples: (a) has a profile and has completed onboarding, or (b) has logged in in the last N days. Option (a) is simpler and uses existing data; (b) needs something like `last_sign_in_at` (e.g. from `auth.users` in a secure function) or a `last_seen_at` on `profiles` updated by the app.

- **Admin UI (e.g. under `/admin/announcements`)**  
  - Form: title, body (optional rich text), optional link, “Send in-app only” vs “In-app + email”.
  - “Send to: All active users” (with optional preview count).
  - On submit: call an Edge Function or Supabase RPC.

- **Backend (Edge Function or RPC)**  
  - **In-app:** Insert one row per target user into `notifications` (type e.g. `announcement`, title, body, link). You can do this in a single batch from a function using the service role.
  - **Email:** Use your existing email sender (e.g. Resend) to send one email per user. Loop over the same list of active users; use each user’s `email` from `profiles` (with a check for null/empty). Respect user’s notification preferences if you want (e.g. “product updates” toggle); otherwise you can send to all active users for announcements.

- **Rate limits / batching**  
  For large user counts, batch inserts and emails (e.g. 50–100 per batch) to avoid timeouts and stay within email provider limits.

**Effort:** Small–medium (1–2 days for a first version: admin form + one Edge Function that creates notifications and sends emails).

---

## 2. Edit ALL comms templates and copy in the admin view

**What you want:** Edit default header/footer, all default notification copy, and any other comms that users see or can toggle in notification settings—so that when you change it in admin, it reflects for all users (as the default).

**Feasibility:** Doable; requires a single source of truth for “app-wide defaults” and wiring the app to use it.

**Current state:**

- **Invoice-related copy** (per user in `profiles`):  
  `invoice_footer`, `invoice_email_message_default`, `invoice_email_subject_default`, `reminder_enabled`, `reminder_subject_default`, `reminder_body_default`, etc.  
  So far these are per-user only; there is no global “default” row.

- **Notification preferences** (per user in `profiles.notification_preferences`):  
  Users toggle in-app/email per category (projects, tasks, invoices, reviews, import/export). The *labels* and any default *copy* (e.g. email subject/body for “Project due soon”) are currently hardcoded in the app (e.g. in `NotificationSettings` and in `notification-preferences.ts`).

**What to add:**

- **Global defaults table**  
  Add a table that only admins can write and everyone can read (or only the app backend reads), e.g.:

  - **Option A – Key-value:** `app_settings` with keys like:  
    `default_invoice_footer`, `default_invoice_email_subject`, `default_reminder_subject`, `default_reminder_body`, `email_header_html`, `email_footer_html`, and keys for each notification type’s default subject/body/label.
  - **Option B – Structured:** e.g. `app_comms_defaults` with columns for each logical group (invoice defaults, reminder defaults, email header/footer, notification copy per type).

  Same idea: one row or a small set of rows that define “the app’s default” for all these strings.

- **Admin UI**  
  - **Comms / Templates** section in admin (e.g. `/admin/comms` or under “Branding”):  
    - Default invoice footer, default invoice email subject/body.  
    - Default reminder subject/body.  
    - Default email header and footer (for all transactional emails).  
    - For each notification type that users can toggle: default label and, if you send emails, default subject and body (or “use system default”).
  - Save writes to the new table; the rest of the app reads from it when no user override exists.

- **App behavior**  
  - **Invoice settings:** When loading a user’s invoice settings, if a field is empty in `profiles`, show (and use) the value from the global defaults table. When the user saves, continue writing to `profiles` (user override). So “edit in admin” = change the default for everyone who hasn’t customized.
  - **Notification settings:** Keep user toggles in `notification_preferences` as they are. The *copy* (labels, email subject/body) for each type comes from the global defaults. If you currently have no email templates per type, you can add them here (e.g. “Project due soon – subject”, “Project due soon – body”) and use them when sending emails. Users still only toggle on/off per channel (in-app / email).

**Effort:** Medium. You need the migration for the new table, admin UI for all fields you want editable, and then replace every place that currently uses a hardcoded default with “read from DB (with code fallback if null)”. Plan ~2–4 days depending on how many templates you expose.

---

## 3. Usage dashboard (active users, simple metrics)

**What you want:** See how many active users you have and a simple usage dashboard.

**Feasibility:** Yes. You already have `profiles` and other tables; you only need a safe way for the admin to read aggregates.

**What to add:**

- **Admin-only RPC (or Edge Function)**  
  Use a Supabase RPC with `SECURITY DEFINER` so it runs with elevated privileges and can:
  - Count rows in `profiles` (total users).
  - Optionally count “active” (e.g. `onboarding_completed = true` and/or `subscription_status` not in (‘cancelled’, ‘past_due’) or similar).
  - Optionally: count projects, time_entries, invoices (total or last 30 days) for a high-level usage view.

  Return a single JSON object, e.g.  
  `{ total_users, active_users, total_projects, total_invoices, time_entries_last_30_d }`.  
  The frontend only calls this RPC when the current user is admin (you already gate admin routes by `profiles.is_admin`).

- **“Active” definition**  
  For “active users” you can start with “has a profile” (total signups) or “onboarding completed”. For “active in last 7/30 days” you’d need either:
  - `auth.users.last_sign_in_at` (only visible in a secure backend, e.g. Edge Function or RPC using `auth.users`), or
  - a `last_seen_at` (or similar) column on `profiles` that the app updates on each request/session.

- **Admin UI**  
  - Add an **Overview** (or **Dashboard**) tab under `/admin` that shows:
    - Active users (total and optionally “active in last 30 days” if you add the data).
    - Simple counts: total projects, total invoices, total time entries (or last 30 days).
  - Call the RPC on load and display the numbers in cards or a simple table.

**Effort:** Small. One migration (RPC), one admin page, and optionally a `last_seen_at` migration + app logic if you want “active in last N days”. A minimal version (total users + a few counts) is on the order of half a day.

---

## Summary

| Feature | Effort | Main pieces |
|--------|--------|-------------|
| Announcements (in-app + email to all active users) | Small–medium | Admin form, Edge Function (or RPC) to create notifications + send emails, define “active” |
| Edit all comms templates and notification copy | Medium | New table for app-wide defaults, admin UI, wire app to read defaults everywhere |
| Usage dashboard (active users, simple metrics) | Small | Admin-only RPC for counts, one admin Overview page |

All three are possible with your current stack; the doc above gives a concrete path for each.
