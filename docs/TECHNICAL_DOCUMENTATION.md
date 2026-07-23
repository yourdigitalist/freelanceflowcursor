# Lance - Technical Documentation
**Last Updated:** July 17, 2026

---

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Architecture Patterns](#architecture-patterns)
3. [Feature Flags & Access Control](#feature-flags--access-control)
4. [Environment Variables](#environment-variables)
5. [Database Schema](#database-schema)
6. [Routes & Protection Logic](#routes--protection-logic)
7. [Edge Functions](#edge-functions)
8. [State Management](#state-management)
9. [API Integrations](#api-integrations)
10. [Analytics & Observability](#analytics--observability)
11. [Account Lifecycle](#account-lifecycle)
12. [Proposals 2 Architecture](#proposals-2-architecture)
13. [File Structure](#file-structure)
14. [Build & Deployment](#build--deployment)
15. [Technical Constraints](#technical-constraints)
16. [What's New Since May 2026](#whats-new-since-may-2026)

---

## Tech Stack

### Core Technologies (with versions)

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | React | ^18.3.1 |
| Build | Vite | ^7.3.1 |
| Language | TypeScript | ^5.8.3 |
| Routing | react-router-dom | ^6.30.1 |
| Backend / DB | Supabase (`@supabase/supabase-js`) | ^2.91.0 |
| Server state | TanStack React Query | ^5.83.0 |
| Forms | react-hook-form + zod + @hookform/resolvers | ^7.61.1 / ^3.25.76 / ^3.10.0 |
| UI | Radix UI primitives, shadcn-style components, Tailwind CSS | ^3.4.17 |
| Drag & drop | @dnd-kit/* | ^6.3.1 / ^10.0.0 |
| Dates | date-fns | ^3.6.0 |
| Charts | recharts | ^2.15.4 |
| Rich text | react-quill, react-markdown | ^2.0.0 / ^10.1.0 |
| PDF | jspdf, html2canvas | ^4.2.1 / ^1.4.1 |
| Animation | framer-motion | ^11.18.2 |
| Toasts | sonner + Radix toast | ^1.7.4 |
| Testing | Vitest + Testing Library | ^3.2.4 |
| Lint | ESLint 9 | ^9.32.0 |

### Build Configuration

**`vite.config.ts`:**
- React SWC plugin for fast refresh
- Path alias: `@/` → `./src`
- Dev server port: **5173**
- HMR overlay enabled

**`tsconfig.json`:**
- Project references architecture
- `strict: false`
- `strictNullChecks: false`

**`vercel.json`:**
- SPA rewrite: `/(.*) → /index.html`
- Favicon redirect

---

## Architecture Patterns

### Application Architecture

- **Single Page Application (SPA)** with client-side routing via `BrowserRouter`
- **Supabase-first backend**: PostgreSQL + Row Level Security + Auth + Storage + Edge Functions
- **Auth context pattern**: `AuthProvider` wraps entire app, provides session management
- **React Query** for server-side data caching and synchronization
- **Feature-based routing**: Protected routes, onboarding flow, admin routes
- **Public token-based access**: Reviews, proposals, contracts, client portal (no JWT at gateway)

### Security Model

**Authentication:**
- Supabase Auth with email/password and magic links
- Session stored via `onAuthStateChange` listener
- Row Level Security (RLS) on all user data tables

**Authorization Layers:**

1. **Route Protection** (`ProtectedRoute`):
   - Requires authenticated user
   - Checks `onboarding_completed` status
   - Validates billing access via `hasBillingAccess()` (`src/lib/billingAccess.ts`):
     - `is_lifetime = true` → always granted
     - `subscription_status = 'active'` → granted
     - `subscription_status = 'trial'` with future `trial_end_date` → granted
   - Redirects to `/settings/subscription` if billing locked (except when already on that route)
   - Refreshes profile on window focus and visibility change

2. **Admin Gate** (`AdminLayout`):
   - Checks `profiles.is_admin` flag
   - Redirects non-admins to `/dashboard`

3. **Feature Flags** (DB-driven via `app_features` table):
   - `notes_access_mode`, `contracts_access_mode`, `proposals2_access_mode`
   - Options per feature: `off`, `admin`, `on`
   - Defaults: Notes `admin`, Contracts `admin`, Proposals 2 `off`
   - Env fallbacks: `VITE_NOTES_ACCESS_MODE`, `VITE_CONTRACTS_ACCESS_MODE` (deprecated)
   - Admin UI: `/admin/features` (`AdminFeatures.tsx`)
   - Route guards: `NotesRoute`, `ContractsRoute`, `Proposals2Route`

### Data Flow Pattern

```
User Action
    ↓
React Component
    ↓
Supabase Client (RLS enforced)
    ↓
PostgreSQL with RLS Policies
    ↓
Response to UI
```

For sensitive operations:
```
User Action
    ↓
Edge Function Call (with Bearer token)
    ↓
Edge Function (validates JWT internally)
    ↓
Supabase Service Role / External API
    ↓
Response
```

### Real-time Features

- **Notifications**: Supabase Realtime channel on `notifications` table
- **Unread badge**: Live count updates via channel subscription
- **Timer state**: localStorage persistence with context provider

---

## Feature Flags & Access Control

### Source of Truth

**Primary:** `app_features` table (single row, `id = 1`)  
**Migration:** `supabase/migrations/20260714100000_app_features.sql`

| Column | Default | Feature |
|--------|---------|---------|
| `notes_access_mode` | `admin` | Notes workspace (`/notes`) |
| `contracts_access_mode` | `admin` | Contracts (`/contracts/*`) |
| `proposals2_access_mode` | `off` | Proposals 2 builder (`/proposals-2/*`) |

### Access Modes (`FeatureAccessMode`)

| Mode | Behavior |
|------|----------|
| `off` | Hidden for everyone; routes redirect to `/dashboard` |
| `admin` | Visible only when `profiles.is_admin = true` |
| `on` | Visible to all authenticated users |

### Code Paths

| Layer | File | Purpose |
|-------|------|---------|
| Types & helpers | `src/lib/features.ts` | `canAccessByMode()`, `resolveAppFeatures()`, `FEATURE_DEFINITIONS` |
| DB fetch | `src/hooks/useAppFeatures.ts` | React Query, 60s stale time |
| Consumer | `src/hooks/useFeatureAccess.ts` | `canAccessNotes`, `canAccessContracts`, `canAccessProposals2` |
| Route guards | `src/App.tsx` | `NotesRoute`, `ContractsRoute`, `Proposals2Route` |
| Sidebar | `src/components/layout/AppLayout.tsx` | Conditionally renders nav items |
| Admin UI | `src/pages/admin/AdminFeatures.tsx` | Toggle access modes without deploy |

### Env Fallbacks (deprecated)

Used only when `app_features` row is unavailable:

| Variable | Default | Feature |
|----------|---------|---------|
| `VITE_NOTES_ACCESS_MODE` | `admin` | Notes |
| `VITE_CONTRACTS_ACCESS_MODE` | `admin` | Contracts |
| Proposals 2 | — | Always `off` if DB unavailable |

---

## Environment Variables

### Frontend Variables (`.env` / Vercel)

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Public anon key for client + Edge Function `apikey` header |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Alternative name for anon key (code accepts both) |
| `VITE_SITE_URL` | ⚠️ | Production site URL for emails/shared links (fallback: `window.location.origin`) |
| `VITE_STRIPE_PRICE_MONTHLY` | ✅ | Stripe Price ID - $29/mo Early Access Monthly |
| `VITE_STRIPE_PRICE_ANNUAL` | ✅ | Stripe Price ID - $290/yr Early Access Annual |
| `VITE_CONTRACTS_ACCESS_MODE` | ⚠️ | **Deprecated** — use `app_features` table; fallback: `off` / `admin` / `on` (default: `admin`) |
| `VITE_NOTES_ACCESS_MODE` | ⚠️ | **Deprecated** — use `app_features` table; fallback: `off` / `admin` / `on` (default: `admin`) |
| `VITE_HCAPTCHA_SITE_KEY` | ⚠️ | hCaptcha site key for auth flows; disabled when unset |
| `VITE_CRISP_WEBSITE_ID` | ⚠️ | Crisp chat widget ID (has default fallback) |
| `VITE_SUPABASE_PROJECT_ID` | ⚠️ | Optional reference |

### Edge Function Secrets (Supabase Dashboard)

**Required for production:**
- `STRIPE_SECRET_KEY` - Stripe API secret key (Lance SaaS subscriptions)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (SaaS billing)
- `STRIPE_CONNECT_SECRET_KEY` - **Test** Connect key only (`sk_test_…`) for invoice Pay now — never live; see `docs/STRIPE_CONNECT_INVOICE_PAYMENTS.md`
- `STRIPE_CONNECT_WEBHOOK_SECRET` - Connect webhook signing secret (test)
- `RESEND_API_KEY` - Resend email API key
- `RESEND_FROM_EMAIL` - Default from address
- `APP_BASE_URL` - Base URL for email links
- `NOTIFICATIONS_CRON_KEY` - Cron job authorization (trial reminders, deadlines, invoice reminders)
- `CLEANUP_CRON_KEY` - Cron job authorization (inactive account cleanup)
- `SUPABASE_SERVICE_ROLE_KEY` - For service role operations
- `SUPABASE_URL` - Project URL for Edge Functions

**Optional:**
- `META_CAPI_ACCESS_TOKEN` - Meta Conversions API (admin test tool in System Check)
- `GEMINI_API_KEY` - AI client summary (`generate-client-summary`)
- `CUSTOMJS_ENDPOINT_URL`, `CUSTOMJS_API_KEY` - Invoice PDF generation via CustomJS

---

## Database Schema

**Total Migrations:** 90 SQL files in `supabase/migrations/`

### Core Tables

#### `profiles` (User Settings & Billing)

**User Info:**
- `user_id` (PK, FK to auth.users)
- `first_name`, `last_name`, `full_name`, `email`
- `phone_number`
- `avatar_url`

**Business Info:**
- `business_name`, `business_email`, `business_phone`, `business_website`
- `business_address`, `business_city`, `business_state`, `business_postal_code`, `business_country`
- `tax_id`
- `business_logo_url`

**Financial:**
- `hourly_rate`, `currency`
- `stripe_customer_id`, `stripe_subscription_id`
- `subscription_status` (trial, active, past_due, paused, cancelled, etc.)
- `plan_type` (pro_monthly, pro_annual)
- `trial_start_date`, `trial_end_date`
- `is_lifetime` (boolean) - bypasses billing lock and account cleanup; service_role only can set `true`
- `stripe_promotion_code` - beta/coupon tracking for admin metrics

**Account Lifecycle:**
- `scheduled_deletion_at` - inactivity deletion schedule
- `deletion_reminder_3d_sent_at`, `deletion_reminder_1d_sent_at` - deletion warning emails sent
- `deletion_export_token` - token for pre-deletion data export
- `account_soft_deleted_at`, `restore_until` - soft delete + 30-day admin restore window

**Invoice Reminders:**
- `reminder_enabled` (boolean) - auto client payment reminders
- `reminder_days_before` - days before due date to send reminder

**Settings:**
- `onboarding_completed` (boolean)
- `is_admin` (boolean)
- `notification_preferences` (JSONB)
- Locale fields: `currency_display`, `date_format`, `time_format`, `timezone`, `number_format`
- Invoice defaults: `invoice_prefix`, `invoice_include_year`, numbering fields
- Proposal defaults: various `proposal_default_*` fields
- Email customization: `client_email_primary_color`, header/footer HTML

#### `clients` (CRM)

**Core Fields:**
- `id`, `user_id`
- `name`, `first_name`, `last_name`
- `email`, `phone`, `company`
- `tax_identification_number`
- Address fields
- `avatar_color`, `logo_url`
- `tags` (text[])

**CRM:**
- `status` (new_lead, contacted, qualified, proposal_sent, negotiation, won, onboarding, active, paused, inactive, closed_lost)
- `lead_source`
- `estimated_value`, `currency`
- `last_contacted_at`
- `archived_at`

**Portal:**
- `portal_enabled` (boolean)
- `portal_token` (unique)
- `portal_sections` (JSONB) - controls visible sections

#### `client_activities`

- `id`, `user_id`, `client_id`
- `type` (note, email, call, meeting, other)
- `title`, `body`
- `occurred_at`

#### `client_follow_ups` (NEW - replaces single follow-up field)

- `id`, `user_id`, `client_id`
- `title` (required, min 1 char)
- `details`
- `due_at`, `remind_at`
- `completed_at`

#### `projects`

- `id`, `user_id`, `client_id`
- `name`, `description`
- `status` (active, on_hold, completed, cancelled)
- `budget`, `hourly_rate`
- `start_date`, `due_date`
- `icon_emoji`, `icon_color`

#### `project_statuses` (Custom Kanban columns)

- `id`, `user_id`, `project_id`
- `name`, `color`, `position`
- `is_done` (boolean) - marks completion columns

#### `tasks`

- `id`, `user_id`, `project_id`
- `title`, `description`
- `status` (legacy text field)
- `status_id` (FK to project_statuses)
- `priority` (low, medium, high, urgent)
- `due_date`
- `estimated_hours`
- `position` (for ordering)

#### `task_comments`

- `id`, `user_id`, `task_id`
- `comment`

#### `time_entries`

- `id`, `user_id`, `project_id`, `task_id`
- `description`
- `start_time`, `end_time`
- `total_duration_seconds`
- `billable` (boolean)
- `hourly_rate`
- `billing_status` (unbilled, billed, paid, not_billable)

#### `time_entry_segments` (Sub-segments)

- `id`, `time_entry_id`
- `start_time`, `end_time`
- `duration_seconds`

#### `invoices`

- `id`, `user_id`, `client_id`, `project_id`
- `invoice_number` (generated via RPC)
- `status` (draft, sent, reminder_sent, paid, overdue, cancelled)
- `issue_date`, `due_date`, `paid_date`
- `sent_at`, `last_sent_at` - send tracking
- `last_reminder_sent_at`, `last_reminder_automatic` - auto-reminder metadata
- `subtotal`, `tax_amount`, `discount_amount`, `total`
- `notes`, `footer`, `bank_details`
- `email_subject`, `email_message`
- `currency`
- `payment_method` - payment method displayed on invoice

#### `invoice_items`

- `id`, `invoice_id`
- `description`, `quantity`, `unit_price`, `amount`
- `line_date`

#### `invoice_time_entry_links` (Audit trail)

- `invoice_id`, `time_entry_id`
- Tracks which time entries were billed on which invoices

#### `taxes`

- `id`, `user_id`
- `name`, `rate`
- `is_default` (boolean)

### Services, Proposals, Contracts (NEW - May 2026)

#### `services` (Service Catalog)

- `id`, `user_id`
- `name`, `description`
- `price`, `currency`
- `is_recurring` (boolean)
- `recurrence_period` (monthly, annually)
- `default_tasks` (JSONB) - checklist items

#### `proposals`

- `id`, `user_id`, `client_id`, `project_id`
- `identifier` (P-YYYY-#####)
- `public_token` (unique)
- `status` (draft, sent, read, accepted, archived)
- `cover_image_url`
- `objective`, `presentation_text`
- `validity_days`, `expires_at`
- `timeline_days`
- `availability_requirement`
- `payment_structure` (upfront, installments)
- `payment_methods` (text[])
- `installment_description`
- `conditions_notes`
- `discount_type` (amount, percentage)
- `discount_value`
- `subtotal`, `discount_amount`, `total`
- `accepted_at`
- `client_snapshot` (JSONB) - frozen client data
- `layout` (JSONB) - Proposals 2 visual document schema (null = legacy proposal)

#### `proposal_services` (Line items)

- `id`, `proposal_id`, `service_id`
- `name`, `description`, `price`
- `is_recurring`, `recurrence_period`
- `order_position`

#### `contracts`

- `id`, `user_id`, `client_id`, `project_id`, `proposal_id`
- `identifier` (C-YYYY-#####)
- `public_token` (unique)
- `template_id`
- `status` (draft, pending_signatures, signed, cancelled)
- Freelancer party fields: `freelancer_name`, `freelancer_email`, etc.
- Client party fields: `client_name`, `client_email`, etc.
- `services` (JSONB)
- `timeline`, `payment_terms`, `additional_clause`
- `discount_type`, `discount_value`, `total`
- `freelancer_signed_at`, `client_signed_at`
- `sent_at` (when status → pending_signatures)
- `cancellation_reason`
- `client_snapshot` (JSONB)

**Lock Trigger:** After `sent_at` set, core fields become immutable.

#### `contract_templates`

- `id`, `user_id`
- `name`, `description`
- `content` (HTML with variable placeholders)
- `is_default` (boolean)

#### `contract_sign_tokens` (OTP for client signing)

- `id`, `contract_id`, `email`
- `token` (6-digit code)
- `expires_at`
- `verified_at`

### Reviews / Approvals

#### `review_folders`

- `id`, `user_id`
- `name`, `emoji`, `color`

#### `review_requests`

- `id`, `user_id`, `client_id`, `project_id`, `folder_id`
- `title`, `description`, `version`
- `status` (pending, approved, rejected, commented)
- `share_token` (unique)
- `due_date`, `sent_at`

#### `review_files`

- `id`, `review_request_id`
- `file_name`, `file_path`, `file_size`
- `file_type`

#### `review_comments`

- `id`, `review_request_id`, `review_file_id`
- `reviewer_name`, `reviewer_email`
- `comment`
- `x_position`, `y_position` (for pinned comments)

#### `review_recipients`

- `id`, `review_request_id`
- `email`, `name`

### Notes

#### `notes`

- `id`, `user_id`, `folder_id`
- `title`, `content` (HTML)
- `client_id`, `project_id` (optional links)
- `tags` (text[])
- `icon_emoji`, `cover_color`
- `comment`

#### `note_folders`

- `id`, `user_id`
- `name`, `emoji`, `color`

### Platform / Admin

#### `notifications`

- `id`, `user_id`
- `type`, `title`, `body`
- `link`
- `read`, `event_key` (for deduplication)

#### `app_branding`

- `id`, `user_id`
- `logo_url`, `icon_url`
- `primary_color`, `secondary_color`
- Sizing fields

#### `app_icon_slots`

- `id`, `user_id`
- `slot_key` (e.g., "sidebar-clients")
- `icon_upload_id`

#### `app_icon_uploads`

- `id`, `user_id`
- `name`, `icon_storage_path`

#### `app_comms_defaults`

- `id`, `user_id`
- Email template defaults (invoice, reminder, trial, etc.)

#### `landing_content`

- `id`, `content` (JSONB)
- CMS for marketing pages

#### `help_content`

- `id`, `title`, `content`, `slug`
- `category`, `order_position`

#### `feedback`

- `id`, `user_id`
- `type`, `content`

#### `feature_requests`

- `id`, `user_id`
- `title`, `description`
- `status` (open, in_progress, completed)
- `votes_count`

#### `feature_request_votes`

- `id`, `user_id`, `feature_request_id`

#### `rate_limits`

- Rate limiting metadata

#### `app_features` (Feature Flags — July 2026)

- `id` (PK, always `1`)
- `notes_access_mode`, `contracts_access_mode`, `proposals2_access_mode`
- `updated_at`
- Single-row table; managed via `/admin/features`

### Storage Buckets

| Bucket Name | Public | Purpose |
|-------------|--------|---------|
| `business-logos` | Yes | Company logos, email branding |
| `client-logos` | Yes | Client logo uploads (NEW) |
| `avatars` | Yes | Profile pictures |
| `proposal-images` | No | Proposal cover images (signed URLs) |
| `review-files` | No | Approval attachments |
| `note-images` | Yes | Rich text editor uploads |
| `app-branding` | Yes | Admin branding assets |
| `app-icons` | Yes | Custom icon uploads |
| Landing assets | Yes | CMS media |

**Storage Limit:** 200 MB per user (`MAX_USER_STORAGE_BYTES` in `src/lib/userStorage.ts`)

---

## Routes & Protection Logic

### Public Routes (No Authentication)

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `LpTest` | Landing page (or redirect to dashboard if authenticated) |
| `/auth` | `Auth` | Sign in / sign up / magic link / forgot password |
| `/reset-password` | `ResetPassword` | Password recovery flow |
| `/terms` | `Terms` | Terms of service |
| `/privacy` | `Privacy` | Privacy policy |
| `/brand-guidelines` | `BrandGuidelines` | Internal brand reference |
| `/lptest` | `LpTest` | Landing page test route |
| `/review/:token` | `ClientReview` | Public approval page (token-based) |
| `/proposal/:token` | `PublicProposal` | Public proposal view/accept |
| `/contract/:token` | `PublicContract` | Public contract view/sign (gated by env) |
| `/portal/:token` | `PublicClientPortal` | Client portal hub |
| `/portal/:portalToken/invoice/:invoiceId` | `PublicPortalInvoice` | Portal invoice detail |
| `/export-account-data` | `ExportAccountData` | Data export (auth or `?token=` from deletion email) |

### Onboarding Route

| Route | Guard | Logic |
|-------|-------|-------|
| `/onboarding` | `OnboardingRoute` | Requires auth; redirects to dashboard if `onboarding_completed=true`; shows email confirmation screen if user not confirmed |

### Protected Routes (Auth + Onboarding + Billing)

**Wrapper:** `ProtectedRoute`

**Requirements:**
1. User authenticated
2. `onboarding_completed = true`
3. `hasBillingAccess(profile)` OR route is `/settings/subscription`:
   - `is_lifetime = true` → access granted
   - `subscription_status = 'active'` → access granted
   - `subscription_status = 'trial'` with future `trial_end_date` → access granted
4. If billing locked → redirect to `/settings/subscription` (except when already on that route)
5. Profile re-checked on window focus and visibility change

**Routes:**

| Path Pattern | Pages | Extra Gate |
|--------------|-------|------------|
| `/dashboard` | Dashboard overview | — |
| `/clients/*` | `/clients` (CRM board), `/clients/list`, `/clients/active`, `/clients/:id` | — |
| `/projects/*` | `/projects` (list), `/projects/:id` (detail with tasks) | — |
| `/time/*` | `/time` (timesheet), `/time/timer`, `/time/history` | — |
| `/notes` | Notes workspace | `NotesRoute` |
| `/invoices/*` | `/invoices` (list), `/invoices/:id` (detail) | — |
| `/services` | Services catalog | — |
| `/proposals/*` | `/proposals` (list), `/proposals/:id` (detail) | — |
| `/proposals-2` | Proposals 2 list | `Proposals2Route` |
| `/proposals-2/:id/builder` | Proposals 2 drag-and-drop builder | `Proposals2Route` |
| `/reviews/*` | `/reviews` (list), `/reviews/:id` (detail) | — |
| `/notifications` | Notification feed | — |
| `/search` | Global search results | — |
| `/feature-requests` | Feature request portal | — |
| `/settings/*` | Settings pages (see below) | Billing lock hides sidebar except subscription |

**Contracts Routes (Conditional):**

| Route | Additional Gate |
|-------|----------------|
| `/contracts/*` | `ContractsRoute` inside `ProtectedRoute` |
| `/contracts/templates/:id` | Requires `canAccessContracts` from `app_features` |

**Logic (via `app_features` table):**
- `off`: No one can access
- `admin`: Only `profiles.is_admin = true`
- `on`: All authenticated users

### Admin Routes

**Wrapper:** `ProtectedRoute` + `AdminLayout`

**Gate:** `AdminLayout` fetches `profiles.is_admin`; redirects non-admins to `/dashboard`

| Route | Page |
|-------|------|
| `/admin` (index) | Redirects to `/admin/overview` |
| `/admin/overview` | Admin dashboard (cards to sections) |
| `/admin/metrics` | Revenue, MRR/ARR, user cohorts, unconfirmed signups |
| `/admin/system-check` | Health checks (trial reminders, billing, Meta CAPI, invoice reminders) |
| `/admin/account-restore` | Restore soft-deleted accounts (30-day window) |
| `/admin/announcements` | Broadcast announcements |
| `/admin/comms` | System email templates |
| `/admin/branding` | App branding settings |
| `/admin/features` | Feature flag toggles (notes, contracts, proposals2) |
| `/admin/icons` | Icon slot management |
| `/admin/help-content` | Help articles CMS |
| `/admin/feature-requests` | Moderate feature requests |
| `/admin/feedback` | View user feedback |

### Route Redirects

| From | To |
|------|-----|
| `/help` | `/feature-requests` |
| `/time/logs` | `/time/history` |
| `/settings` | `/settings/profile` |
| `/admin` | `/admin/overview` |

### ProtectedRoute Flow Diagram

```
User visits protected route
    ↓
Auth loading? → Show spinner
    ↓
No user? → Redirect to /auth
    ↓
Fetch profile (onboarding_completed, subscription_status, trial_end_date)
    ↓
onboarding_completed = false? → Redirect to /onboarding
    ↓
Check billing access:
  - is_lifetime = true → ✅ Access granted
  - subscription_status = 'active' → ✅ Access granted
  - subscription_status = 'trial' AND trial_end_date >= today → ✅ Access granted
  - Otherwise → ❌ No billing access
    ↓
No billing access AND not on /settings/subscription? → Redirect to /settings/subscription
    ↓
✅ Render protected children
```

---

## Edge Functions

**Location:** `supabase/functions/`  
**Total:** 41 Edge Functions

**Configuration:** `supabase/config.toml` sets `verify_jwt = false` for most functions; JWT validation done inside functions where needed.

### Billing & Subscription

| Function | Purpose |
|----------|---------|
| `create-checkout-session` | Creates Stripe Checkout session for subscription upgrade (15-day trial if applicable) |
| `create-portal-session` | Generates Stripe Customer Portal URL for billing management |
| `start-free-trial` | **Onboarding:** Creates Stripe customer + subscription with 15-day trial, no payment method required; sets `onboarding_completed` |
| `complete-onboarding-after-checkout` | Post-Stripe-Checkout fallback; sets `onboarding_completed`, updates trial/subscription data |
| `stripe-webhook` | Handles Stripe events: `customer.subscription.*`, updates `profiles` subscription status |
| `billing-health` | Admin diagnostic: checks subscription states, Stripe sync |
| `sync-stripe-promotion-codes` | Admin backfill of `profiles.stripe_promotion_code` from Stripe |

### Account Management

| Function | Purpose |
|----------|---------|
| `delete-account` | User-initiated account deletion; bans user, soft-deletes data, sends confirmation email |
| `restore-account` | Admin restore of soft-deleted account within 30-day window |
| `export-account-data` | JSON export of all user data (auth or deletion token) |
| `cleanup-inactive-accounts` | **Cron:** Inactivity warnings (3d/1d), soft delete, permanent delete after restore window |
| `send-account-deleted` | Sends "account deleted" confirmation via Resend |

### Invoices

| Function | Purpose |
|----------|---------|
| `send-invoice` | Generates PDF (CustomJS), sends email via Resend with attachment; adds Stripe **Pay now** when Connect is ready |
| `send-invoice-reminders` | **Cron:** Automatic client payment reminders based on `profiles.reminder_enabled` |
| `view-invoice-pdf` | Public/signed URL for viewing invoice PDF (for portal) |
| `create-connect-account-link` | Stripe Connect Standard onboarding (test keys only) |
| `disconnect-connect-account` | Clears Connect linkage on profile |
| `create-invoice-payment-session` | Checkout Session on connected account for an invoice |
| `stripe-connect-webhook` | Marks invoices paid; syncs Connect account status (test) |
| `preview-email-templates` | Admin email template previews |

### Reviews / Approvals

| Function | Purpose |
|----------|---------|
| `send-review-request` | Emails review request link to recipients |
| `get-review` | Fetches review data by `share_token` (public, no JWT) |
| `submit-review-comment` | Client posts comment on review |
| `update-review-comment` | Client edits own comment (by email match) |
| `delete-review-comment` | Client deletes own comment |
| `update-review-status` | Client approves/rejects review |
| `upload-review-file` | Handles file upload to `review-files` bucket |

### Proposals

| Function | Purpose |
|----------|---------|
| `send-proposal` | Emails proposal link to client |
| `view-proposal` | Fetches proposal by `public_token` (public) |
| `accept-proposal` | Client accepts proposal, triggers notification |

### Contracts

| Function | Purpose |
|----------|---------|
| `send-contract-otp` | Sends 6-digit OTP to client email for signing |
| `verify-contract-otp` | Verifies OTP, records client signature |
| `get-contract` | Fetches contract by `public_token` (public) |
| `update-contract-client-details` | Client updates their details before signing |
| `cancel-contract` | Cancels contract with reason |

### Client Portal

| Function | Purpose |
|----------|---------|
| `view-client-portal` | Fetches portal data by `portal_token`: client details, enabled sections |
| `send-client-portal-link` | Emails portal link to client |

### Notifications & Communications

| Function | Purpose |
|----------|---------|
| `send-trial-reminders` | **Cron:** Sends trial expiry emails (5 days, 1 day, day-of); also callable by admin for testing |
| `send-deadline-notifications` | **Cron:** Sends due/overdue notifications for projects, tasks, invoices, contracts |
| `send-announcement` | Admin broadcasts announcement to users |
| `send-feedback-notification` | Notifies admin of new feedback submission |
| `send-contact-message` | Contact form submission (landing page) |
| `send-meta-capi-event` | Meta Conversions API (admin test tool) |
| `sync-users-to-resend` | Syncs user email + marketing preferences to Resend audience |

### Miscellaneous

| Function | Purpose |
|----------|---------|
| `generate-client-summary` | AI-powered client summary via Gemini |

### Cron Jobs (pg_cron)

Set up via migrations:

| Schedule | Function | Secret | Purpose |
|----------|----------|--------|---------|
| Every 12 hours | `send-trial-reminders` | `NOTIFICATIONS_CRON_KEY` | Trial expiry emails |
| Every 6 hours | `send-deadline-notifications` | `NOTIFICATIONS_CRON_KEY` | Due/overdue items |
| Daily 2 AM UTC | `sync-users-to-resend` | — | Marketing preference sync |
| Daily 08:30 UTC | `send-invoice-reminders` | `NOTIFICATIONS_CRON_KEY` | Client payment reminders |
| Daily 10:00 UTC | `cleanup-inactive-accounts` | `CLEANUP_CRON_KEY` | Inactive account lifecycle |

---

## State Management

### Global Contexts

| Context | File | Purpose |
|---------|------|---------|
| `AuthProvider` / `useAuth` | `src/lib/auth.tsx` | User session, auth methods (signUp, signIn, signOut, magic link, password reset) |
| `TimerProvider` / `useTimer` | `src/contexts/TimerContext.tsx` | Global timer state, localStorage persistence (`lance_timer_draft`), start/stop/log/resume |
| `IconSlotProvider` / `SlotIcon` | `src/contexts/IconSlotContext.tsx` | Admin-configurable icon system, maps slot keys to Lucide icons or uploads |
| `SettingsDirtyContext` | `src/contexts/SettingsDirtyContext.tsx` | Tracks unsaved settings changes, warns on navigation |

### Custom Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useProfileCurrency` | `src/hooks/useProfileCurrency.ts` | Format currency values using user's profile settings |
| `useLocalePreferences` | `src/hooks/useLocalePreferences.ts` | Date/time/number formatting per user locale |
| `useBranding` | `src/hooks/useBranding.ts` | Fetches app-wide branding from `app_branding` table (React Query) |
| `useIconSlots` | `src/hooks/useIconSlots.ts` | Fetches icon slot mappings (React Query) |
| `useLandingContent` | `src/hooks/useLandingContent.ts` | Fetches landing page CMS content (React Query) |
| `useAppFeatures` | `src/hooks/useAppFeatures.ts` | Fetches `app_features` row (React Query, 60s stale) |
| `useFeatureAccess` | `src/hooks/useFeatureAccess.ts` | Resolves `canAccessNotes`, `canAccessContracts`, `canAccessProposals2` |
| `useBillingLock` | `src/hooks/useBillingLock.ts` | Determines if user is billing-locked (sidebar hidden) |
| `useShellProfile` | `src/hooks/useShellProfile.ts` | Profile data for app shell (name, avatar, plan badge) |
| `useInAppNotificationAlerts` | `src/hooks/useInAppNotificationAlerts.ts` | Real-time notification toast alerts |
| `useLanceServiceAgreementDisclaimer` | `src/hooks/useLanceServiceAgreementDisclaimer.ts` | Manages contract disclaimer acceptance (localStorage) |
| `use-mobile` | `src/hooks/use-mobile.tsx` | Responsive breakpoint detection |
| `use-toast` | shadcn pattern | Toast notification wrapper |

### React Query Usage

React Query is used **selectively** for:
- App branding (global)
- Icon slots (global)
- Landing content (admin)
- Some settings pages

Most data fetching uses direct Supabase client calls with local React state.

### localStorage Keys

| Key | Purpose |
|-----|---------|
| `lance_timer_draft` | Persists active timer state (project, task, segments) |
| `lance_service_agreement_disclaimer` | Contract disclaimer acceptance |
| `reviewer_name`, `reviewer_email` | Client identity on public review page |

---

## API Integrations

### Supabase

**Features Used:**
- **Auth**: Email/password, magic links, session management
- **Database**: PostgreSQL with PostgREST auto-API
- **Storage**: Multi-bucket file storage with signed URLs
- **Realtime**: Notifications channel for live badge count
- **Edge Functions**: 41 Deno functions for server-side logic

**Client Config:**
```typescript
// src/integrations/supabase/client.ts
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storage: window.localStorage,
    },
  }
);
```

**Types:** Auto-generated in `src/integrations/supabase/types.ts` from database schema

### Stripe

**Integration Points:**
- **Onboarding trial:** `start-free-trial` creates customer + subscription with 15-day trial, no payment method
- **Checkout:** `create-checkout-session` Edge Function for subscription upgrade/change
- **Customer Portal:** `create-portal-session` generates portal link for billing management
- **Webhooks:** `stripe-webhook` handles subscription lifecycle events
- **Price IDs:** Configured via `VITE_STRIPE_PRICE_MONTHLY` and `VITE_STRIPE_PRICE_ANNUAL`
- **Promotion codes:** `profiles.stripe_promotion_code`; beta codes excluded from admin revenue metrics

**Subscription States Synced to `profiles.subscription_status`:**
- `trial` — active trial period
- `active` — paid subscription
- `paused` — trial ended without payment method (Stripe `missing_payment_method` behavior)
- `past_due` — payment failed
- `cancelled` — subscription cancelled

**Events Handled:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`

### Resend

**Purpose:** Transactional email delivery

**Email Types:**
- Invoice emails with PDF attachments
- Review request notifications
- Proposal links
- Contract signing OTP codes
- Trial reminder emails
- Deadline notifications
- Account deletion confirmations
- Announcements

**Integration:**
- Handled exclusively in Edge Functions (not in frontend)
- API key stored as Supabase secret
- Sender email configured via `RESEND_FROM_EMAIL`

**Marketing Sync:**
- `sync-users-to-resend` function syncs user emails to Resend audience
- Respects `notification_preferences.marketing.product_updates.email` setting

### Crisp

**Purpose:** Customer support chat widget

**Implementation:**
- `CrispChat.tsx` component loads Crisp script
- Widget ID: `VITE_CRISP_WEBSITE_ID`
- Default ID baked into code as fallback
- External help center: `https://get-lance.crisp.help/en/`
- Hidden on public client routes (`src/lib/publicClientRoutes.ts`)

### hCaptcha

**Purpose:** Bot protection on auth flows

**Implementation:**
- `HCaptchaWidget.tsx` component — disabled when `VITE_HCAPTCHA_SITE_KEY` unset
- Used in `Auth.tsx` for sign-in, sign-up, magic link, password reset
- Secret key configured in Supabase Auth → Attack Protection (not in frontend env)

---

## Analytics & Observability

### Google Analytics 4

- **ID:** `G-F987NCEKDC` (in `index.html` + `src/lib/googleAnalytics.ts`)
- **Component:** `GoogleAnalytics.tsx` — SPA page views, landing/signup events, confirmed signup once

### Meta Pixel

- **ID:** `1377760630866019`
- **Component:** `MetaPixel.tsx` — PageView, ViewContent (landing), Lead (signup tab)
- **In-app events** (`src/lib/metaPixel.ts`): CompleteRegistration, StartTrial, InitiateCheckout, Subscribe, Purchase

### Meta Conversions API

- **Edge function:** `send-meta-capi-event` (admin test tool in System Check)
- **Secret:** `META_CAPI_ACCESS_TOKEN`

### Hotjar / ContentSquare

- **Component:** `Hotjar.tsx` — loads only in **production**, excludes public client routes
- **Script:** ContentSquare UXA script
- Documented in Privacy policy

### Crisp (see API Integrations above)

---

## Account Lifecycle

### Onboarding Flow (Current)

**Single screen** (`src/pages/Onboarding.tsx`):
1. Business name (required)
2. Currency (searchable, default USD)
3. **Start free trial** → calls `start-free-trial` edge function with `VITE_STRIPE_PRICE_ANNUAL`
4. No Stripe Checkout during onboarding; no payment method required
5. Syncs user to Resend after email verified
6. Meta events: CompleteRegistration, StartTrial

### Billing States

| State | `subscription_status` | App Access |
|-------|----------------------|------------|
| Active trial | `trial` (future `trial_end_date`) | Full access |
| Active subscription | `active` | Full access |
| Trial ended, no PM | `paused` | Billing lock → `/settings/subscription` only |
| Past due | `past_due` | Billing lock |
| Lifetime | `is_lifetime = true` | Full access (bypasses all billing checks) |

### Trial Mechanics

- **Duration:** 15 days from `start-free-trial` call
- **No credit card required** at signup
- Stripe `trial_settings.end_behavior.missing_payment_method: "pause"` → subscription pauses at trial end if no payment method added
- User adds payment via Settings → Billing → Stripe Checkout or Customer Portal

### Account Deletion Lifecycle

| Stage | Mechanism | Details |
|-------|-----------|---------|
| User-initiated | `UserSettings` → `delete-account` | Type DELETE to confirm; immediate soft delete |
| Inactivity warnings | `cleanup-inactive-accounts` cron | 7+ days post-trial without active sub |
| 3-day / 1-day reminders | Same cron | Includes data export token link |
| Soft delete | Ban user; set `account_soft_deleted_at`, `restore_until` (+30 days) | Data preserved |
| Admin restore | `AdminAccountRestore` → `restore-account` | Within 30-day window |
| Permanent delete | After restore window via cron | Irreversible |
| Data export | `/export-account-data` or `?token=` from warning email | JSON export of all user data |

### UI Banners (priority order in `AppLayout`)

1. **Scheduled deletion** — `ScheduledDeletionBanner` when `scheduled_deletion_at` is set
2. **Email verification** — `EmailVerificationBanner` until email confirmed
3. **Trial** — `TrialBanner` during active trial

### Billing Lock UI

When `isBillingLocked()` is true:
- Settings sidebar hidden
- Only subscription content shown via `BillingLockLayout`
- All other routes redirect to `/settings/subscription`

---

## Proposals 2 Architecture

### Overview

Visual drag-and-drop proposal builder running alongside legacy proposals. Uses the same `proposals` table with a `layout` JSONB column to distinguish Proposals 2 records.

### Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/proposals-2` | `Proposals2.tsx` | List (filters `layout IS NOT NULL`) |
| `/proposals-2/:id/builder` | `Proposals2Builder.tsx` | Visual builder |

### Gating

- `proposals2_access_mode` in `app_features` (default `off`)
- Sidebar badge: **Admin** (indigo)

### Layout Schema (`src/lib/proposals2/layoutSchema.ts`)

**Document:** `version: 1`, `theme.mainColor`, `containers[]` (1–2 columns)

**Block types:**
- `heading` — H1/H2/H3 with text styling
- `paragraph` — Rich text with styling
- `image` — Image with alt, border radius
- `divider` — Horizontal rule
- `proposal-meta` — Identifier, project name
- `client-business` — Client and business details
- `services-table` — Line items with optional description/quantity
- `totals` — Subtotal, discount, total
- `conditions` — Terms, timeline, payment structure
- `acceptance` — Client accept button (public view)
- `spacer` — Vertical spacing

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| `ProposalLayoutEditor` | `src/components/proposals2/` | Drag-and-drop editor canvas |
| `ProposalRenderer` | `src/components/proposals2/` | Renders layout for preview/public view |
| `ProposalBuilderInspector` | `src/components/proposals2/` | Block property editor sidebar |
| Builder utils | `src/lib/proposals2/builderUtils.ts` | Layout manipulation helpers |

### Data Flow

1. New draft created in `proposals` table with `layout: null`
2. Builder initializes default layout on first open
3. Autosave writes `layout` JSONB to `proposals` row
4. Public view at `/proposal/:token` renders via `ProposalRenderer`
5. Acceptance flow unchanged (uses `accept-proposal` edge function)

### Go-Live Status

See `docs/PROPOSALS2_GO_LIVE_CHECKLIST.md` for rollout gates. Currently admin-beta only.

---

## File Structure

```
/Users/marinagurgel/Get Lance/Get Lance App Cursor/
├── public/
│   ├── brand-guidelines/       # Brand assets
│   └── ...                      # Static assets, favicon
│
├── src/
│   ├── pages/
│   │   ├── Auth.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Clients.tsx
│   │   ├── Projects.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── TimeTracking.tsx    # Timesheet view
│   │   ├── Timer.tsx
│   │   ├── TimeHistory.tsx     # All logs
│   │   ├── Invoices.tsx
│   │   ├── InvoiceDetail.tsx
│   │   ├── Services.tsx        # NEW
│   │   ├── Proposals.tsx       # Legacy proposals
│   │   ├── ProposalDetail.tsx  # Legacy proposal editor
│   │   ├── Proposals2.tsx      # Proposals 2 list
│   │   ├── Proposals2Builder.tsx  # Proposals 2 builder
│   │   ├── Contracts.tsx
│   │   ├── ContractDetail.tsx
│   │   ├── ExportAccountData.tsx  # Data export page
│   │   ├── ReviewRequests.tsx
│   │   ├── ReviewRequestDetail.tsx
│   │   ├── ClientReview.tsx    # Public
│   │   ├── PublicProposal.tsx  # NEW
│   │   ├── PublicContract.tsx  # NEW
│   │   ├── PublicClientPortal.tsx  # NEW
│   │   ├── Notes.tsx
│   │   ├── Notifications.tsx
│   │   ├── SearchResults.tsx
│   │   ├── FeatureRequests.tsx
│   │   ├── settings/
│   │   │   ├── UserSettings.tsx          # Profile (was ProfileSettings)
│   │   │   ├── BusinessSettings.tsx      # Company
│   │   │   ├── LocaleSettings.tsx
│   │   │   ├── InvoiceSettings.tsx
│   │   │   ├── ProposalSettings.tsx
│   │   │   ├── NotificationSettings.tsx
│   │   │   ├── SubscriptionSettings.tsx
│   │   │   └── StorageSettings.tsx
│   │   ├── admin/
│   │   │   ├── AdminOverview.tsx
│   │   │   ├── AdminMetrics.tsx          # Revenue & user cohorts
│   │   │   ├── AdminAccountRestore.tsx   # Soft-delete restore
│   │   │   ├── AdminFeatures.tsx         # Feature flag toggles
│   │   │   ├── AdminAnnouncements.tsx
│   │   │   ├── AdminComms.tsx
│   │   │   ├── BrandingSettings.tsx
│   │   │   ├── AdminIcons.tsx
│   │   │   ├── HelpContentSettings.tsx
│   │   │   ├── FeatureRequestSettings.tsx
│   │   │   ├── FeedbackSettings.tsx
│   │   │   └── SystemCheck.tsx
│   │   └── ...
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── SettingsLayout.tsx
│   │   │   └── ...
│   │   ├── tasks/
│   │   │   ├── TaskKanbanView.tsx
│   │   │   ├── TaskListView.tsx
│   │   │   └── ...
│   │   ├── ui/              # shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── contexts/
│   │   ├── TimerContext.tsx
│   │   ├── IconSlotContext.tsx
│   │   └── SettingsDirtyContext.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts (via lib/auth.tsx)
│   │   ├── useProfileCurrency.ts
│   │   ├── useLocalePreferences.ts
│   │   ├── useBranding.ts
│   │   ├── useIconSlots.ts
│   │   ├── useLandingContent.ts
│   │   ├── useLanceServiceAgreementDisclaimer.ts
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   │
│   ├── lib/
│   │   ├── auth.tsx             # AuthProvider + hooks
│   │   ├── billingAccess.ts     # hasBillingAccess(), isBillingLocked()
│   │   ├── features.ts          # Feature flag types and helpers
│   │   ├── metaPixel.ts         # Meta Pixel event tracking
│   │   ├── googleAnalytics.ts   # GA4 event tracking
│   │   ├── utils.ts             # cn(), etc.
│   │   ├── billing.ts           # Billing helpers
│   │   ├── userStorage.ts       # Storage limit logic
│   │   ├── invoiceNumbering.ts  # Invoice number generation
│   │   ├── csvHelpers.ts        # CSV import/export
│   │   ├── locale-data.ts       # Currency/timezone data
│   │   ├── site-url.ts          # URL generation
│   │   ├── publicClientRoutes.ts # Routes where Crisp/Hotjar hidden
│   │   └── proposals2/          # Proposals 2 layout schema & utils
│   │
│   ├── integrations/supabase/
│   │   ├── client.ts            # Supabase client instance
│   │   └── types.ts             # Generated DB types
│   │
│   ├── App.tsx                  # Router + route protection
│   ├── main.tsx                 # React entry + providers
│   └── index.css                # Global styles + design system
│
├── supabase/
│   ├── migrations/              # 90 SQL migration files
│   ├── functions/               # 41 Edge Functions (Deno)
│   └── config.toml              # Edge Function config
│
├── scripts/
│   ├── seed.ts                  # Database seeding
│   └── push-email-templates.ts # Push comms defaults
│
├── docs/
│   └── ...                      # Documentation
│
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── vercel.json
└── ...
```

---

## Build & Deployment

### Development

```bash
# Install dependencies
npm install

# Start dev server (Vite)
npm run dev
# → http://localhost:5173

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm run test
npm run test:ui  # Opens Vitest UI
```

### Production Build

```bash
# Build static files
npm run build
# → Output: dist/

# Preview production build
npm run preview

# Verify (test + build)
npm run verify

# Verify all (test + lint + build)
npm run verify:all
```

### Deployment (Vercel)

**Configuration:** `vercel.json`
- SPA rewrite: All routes → `/index.html`
- Static file serving from `dist/`

**Environment Variables:**
Set all `VITE_*` variables in Vercel project settings.

**Deployment Steps:**
1. Push to main branch (or configured branch)
2. Vercel automatically builds and deploys
3. Edge Functions deployed separately to Supabase

### Supabase

**Migrations:**
```bash
supabase db push
# Or via Supabase Dashboard > Database > Migrations
```

**Edge Functions:**
```bash
supabase functions deploy <function-name>
# Or deploy all:
supabase functions deploy
```

**Secrets:**
```bash
supabase secrets set STRIPE_SECRET_KEY="sk_..."
supabase secrets set RESEND_API_KEY="re_..."
# etc.
```

---

## Technical Constraints

### Hard Limits

| Constraint | Value | Enforcement |
|------------|-------|-------------|
| User storage | **200 MB** | UI warning + tracking in `StorageSettings.tsx` |
| Profile photo | **500 KB** | Form validation in `UserSettings.tsx` |
| Business logo | **1 MB** | Form validation in `CompanySettings.tsx` |
| Proposal cover | **10 MB** | Form validation in `ProposalSettings.tsx` |
| Trial period | **15 days** | Set in Stripe checkout session |
| Invoice number padding | **1-6 digits** | Clamped in settings form |
| Proposal validity | **Minimum 1 day** | Zod validation |
| Service price | **Must be > 0** if provided | Zod validation |

### Business Rules

| Rule | Implementation |
|------|----------------|
| **Billing gate** | Expired trial / paused sub blocks all routes except `/settings/subscription` via `ProtectedRoute` |
| **Lifetime bypass** | `is_lifetime = true` bypasses billing lock and account cleanup crons |
| **Contract lock** | After `sent_at` is set, core fields immutable via DB trigger |
| **Invoice numbering** | Atomic via `next_invoice_number()` RPC with row lock on `profiles` |
| **Invoice reminders** | Auto-sent via cron when `profiles.reminder_enabled = true`; status → `reminder_sent` |
| **Client archiving** | Soft delete with `archived_at`; hard delete only if no related records |
| **Follow-up title** | Required, minimum 1 character (DB constraint) |
| **Feature access** | Gated by `app_features` table (`off` / `admin` / `on`) |
| **Account deletion** | 30-day soft-delete restore window; permanent delete after |
| **One user per account** | No team/workspace features in current version |

### Performance Considerations

| Area | Notes |
|------|-------|
| Time entries list | Limited to 200 most recent in UI |
| Search results | Max 10 per category |
| RLS policies | Indexed on `user_id` for all user tables |
| Realtime | Limited to notifications table only |
| File uploads | Direct to Supabase Storage, not through API |
| Invoice PDF | Generated on-demand in Edge Function (not pre-rendered) |

---

## What's New Since May 2026

### June 2026

1. **Lifetime Access (`is_lifetime`)**
   - Grandfathered existing users at migration cutover
   - Bypasses billing lock, trial banner, scheduled deletion, cleanup crons
   - Only `service_role` can set `true`

2. **Simplified Onboarding**
   - Replaced 4-step flow with single screen
   - `start-free-trial` edge function: 15-day trial without payment method
   - No Stripe Checkout during onboarding
   - Default annual plan (`VITE_STRIPE_PRICE_ANNUAL`)

3. **Admin Metrics Dashboard** (`/admin/metrics`)
   - RPCs: `get_admin_metrics()`, `get_admin_users_list()`
   - MRR/ARR, user cohorts (trial, paying, ghosted, unconfirmed)
   - Beta promotion code exclusion from revenue
   - Unconfirmed signup tracking

4. **Note Tags** (`note_tags` migration)
   - Tag support on notes workspace

5. **Stripe Promotion Codes**
   - `profiles.stripe_promotion_code` column
   - `sync-stripe-promotion-codes` edge function for admin backfill
   - Beta codes excluded from revenue metrics

6. **Contract Client Confirm Before Sign**
   - Clients can confirm details before OTP signing flow

### July 2026

7. **Feature Flags System** (`app_features` table)
   - DB-driven toggles for Notes, Contracts, Proposals 2
   - Admin UI at `/admin/features`
   - Replaces env-only `VITE_CONTRACTS_ACCESS_MODE`

8. **Proposals 2** (Admin Beta)
   - Visual drag-and-drop builder (`/proposals-2`, `/proposals-2/:id/builder`)
   - `proposals.layout` JSONB column
   - Block-based document schema (heading, paragraph, services-table, totals, etc.)
   - See `docs/PROPOSALS2_GO_LIVE_CHECKLIST.md`

9. **Invoice Auto-Reminders**
   - `send-invoice-reminders` cron (daily 08:30 UTC)
   - New status: `reminder_sent`
   - `profiles.reminder_enabled`, `profiles.reminder_days_before`
   - `invoices.last_reminder_sent_at`, `last_reminder_automatic`

10. **Account Lifecycle Management**
    - `cleanup-inactive-accounts` cron (daily 10:00 UTC)
    - Soft delete with 30-day restore window
    - `AdminAccountRestore` page
    - `export-account-data` page and edge function
    - `restore-account` edge function
    - Deletion warning emails with export token

11. **Analytics Integrations**
    - Google Analytics 4 (`G-F987NCEKDC`)
    - Meta Pixel (`1377760630866019`) with in-app events
    - Meta Conversions API (`send-meta-capi-event`)
    - Hotjar/ContentSquare (production only, excludes public routes)

12. **hCaptcha on Auth**
    - Optional bot protection via `VITE_HCAPTCHA_SITE_KEY`
    - All auth flows: sign-in, sign-up, magic link, password reset

13. **Admin Unconfirmed Signups**
    - Tracking and metrics for users who haven't confirmed email

14. **Invoice Send Timestamps**
    - `sent_at`, `last_sent_at` on invoices

15. **Time Entry Invoiced Status**
    - Billing status tracking for invoiced time entries

### Database Changes (May–July 2026)

**New Tables:**
- `app_features` (July)

**New Columns:**
- `profiles`: `is_lifetime`, `stripe_promotion_code`, deletion lifecycle fields, `reminder_enabled`, `reminder_days_before`
- `proposals`: `layout` (JSONB)
- `invoices`: `reminder_sent` status, `last_reminder_sent_at`, `last_reminder_automatic`, `sent_at`, `last_sent_at`, `payment_method`

**New RPCs:**
- `get_admin_metrics()` — extended with unconfirmed signups
- `get_admin_users_list()` — email confirmation fields
- `get_restorable_accounts()` — admin restore list
- `get_deletion_reminder_3d_candidates()`, `get_deletion_reminder_1d_candidates()`
- `get_permanent_deletion_candidates()`
- `is_beta_promotion_code()`
- `clear_profile_deletion_schedule()`

### Routes Added (May–July 2026)

- `/proposals-2`, `/proposals-2/:id/builder`
- `/export-account-data`
- `/admin/metrics`, `/admin/account-restore`, `/admin/features`

### Routes Removed

- `/admin/landing-content` (CMS table exists but admin page removed)

### Edge Functions Added (May–July 2026)

- `start-free-trial` — Onboarding trial without payment method
- `send-invoice-reminders` — Automatic client payment reminders
- `cleanup-inactive-accounts` — Inactive account lifecycle
- `restore-account` — Admin account restore
- `export-account-data` — User data export
- `send-meta-capi-event` — Meta Conversions API
- `sync-stripe-promotion-codes` — Promotion code backfill
- `preview-email-templates` — Admin email previews
- `billing-health` — Subscription diagnostic
- `send-account-deleted` — Deletion confirmation email
- `send-contact-message` — Landing contact form
- `send-feedback-notification` — Admin feedback notification
- `delete-review-comment` — Client comment deletion

---

## Additional Technical Notes

### Type Safety

- **TypeScript:** Non-strict mode (`strict: false`)
- **Database types:** Auto-generated from Supabase schema
- **Form validation:** Zod schemas throughout
- **Type imports:** Centralized in `src/integrations/supabase/types.ts`

### Error Handling

- **Error boundaries:** Root level in `main.tsx` + nested in `App.tsx`
- **Toast notifications:** `sonner` for user-facing errors
- **Console logging:** Development errors logged to console
- **Sentry:** Not currently integrated (potential future addition)

### Testing

- **Framework:** Vitest + Testing Library
- **Config:** `vitest.config.ts`
- **Coverage:** Not enforced
- **E2E:** Not currently implemented

### Security Considerations

- **RLS enforced** on all user-facing tables
- **Service role** used only in Edge Functions
- **Public functions** validate tokens server-side
- **OTP codes** expire after 15 minutes (configurable)
- **Contract lock** prevents tampering after send
- **hCaptcha** optional bot protection on auth flows
- **Account soft-delete** preserves data for 30-day restore window
- **Deletion export tokens** time-limited for data export
- **Rate limiting** table exists but enforcement TBD

### Future Technical Debt

1. Enable TypeScript strict mode
2. Add comprehensive test coverage
3. Implement proper error tracking (Sentry)
4. Add E2E tests for critical flows
5. Optimize RLS policies for scale
6. Implement rate limiting enforcement
7. Add webhook retry logic
8. Optimize bundle size (code splitting)

---

**End of Technical Documentation**
