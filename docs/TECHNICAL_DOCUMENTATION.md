# Lance - Technical Documentation
**Last Updated:** May 26, 2026

---

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Architecture Patterns](#architecture-patterns)
3. [Environment Variables](#environment-variables)
4. [Database Schema](#database-schema)
5. [Routes & Protection Logic](#routes--protection-logic)
6. [Edge Functions](#edge-functions)
7. [State Management](#state-management)
8. [API Integrations](#api-integrations)
9. [File Structure](#file-structure)
10. [Build & Deployment](#build--deployment)
11. [Technical Constraints](#technical-constraints)
12. [What's New Since April 2026](#whats-new-since-april-2026)

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
   - Validates active subscription or valid trial
   - Redirects to `/settings/subscription` if trial expired

2. **Admin Gate** (`AdminLayout`):
   - Checks `profiles.is_admin` flag
   - Redirects non-admins to `/dashboard`

3. **Feature Flags**:
   - `VITE_CONTRACTS_ACCESS_MODE`: Controls contract feature visibility
   - Options: `off`, `admin`, `on`
   - Default: `admin` (only admins see contracts)

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
| `VITE_CONTRACTS_ACCESS_MODE` | ⚠️ | `off` / `admin` / `on` - contracts feature gating (default: `admin`) |
| `VITE_CRISP_WEBSITE_ID` | ⚠️ | Crisp chat widget ID (has default fallback) |
| `VITE_SUPABASE_PROJECT_ID` | ⚠️ | Optional reference |

### Edge Function Secrets (Supabase Dashboard)

**Required for production:**
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
- `RESEND_API_KEY` - Resend email API key
- `RESEND_FROM_EMAIL` - Default from address
- `APP_BASE_URL` - Base URL for email links
- `NOTIFICATIONS_CRON_KEY` - Cron job authorization
- `SUPABASE_SERVICE_ROLE_KEY` - For service role operations
- `SUPABASE_URL` - Project URL for Edge Functions

---

## Database Schema

**Total Migrations:** 69 SQL files in `supabase/migrations/`

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
- `subscription_status` (trial, active, past_due, cancelled, etc.)
- `plan_type` (monthly, annual)
- `trial_start_date`, `trial_end_date`

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
- `status` (draft, sent, paid, overdue, cancelled)
- `issue_date`, `due_date`, `paid_date`
- `subtotal`, `tax_amount`, `discount_amount`, `total`
- `notes`, `footer`, `bank_details`
- `email_subject`, `email_message`
- `currency`

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

### Onboarding Route

| Route | Guard | Logic |
|-------|-------|-------|
| `/onboarding` | `OnboardingRoute` | Requires auth; redirects to dashboard if `onboarding_completed=true`; shows email confirmation screen if user not confirmed |

### Protected Routes (Auth + Onboarding + Billing)

**Wrapper:** `ProtectedRoute`

**Requirements:**
1. User authenticated
2. `onboarding_completed = true`
3. Active subscription OR valid trial (not expired)
4. If trial expired → redirect to `/settings/subscription` (except when already on that route)

**Routes:**

| Path Pattern | Pages |
|--------------|-------|
| `/dashboard` | Dashboard overview |
| `/clients/*` | `/clients` (CRM board), `/clients/list`, `/clients/active` |
| `/projects/*` | `/projects` (list), `/projects/:id` (detail with tasks) |
| `/time/*` | `/time` (timesheet), `/time/timer`, `/time/history` (was `/time/logs`) |
| `/notes` | Notes workspace |
| `/invoices/*` | `/invoices` (list), `/invoices/:id` (detail) |
| `/services` | Services catalog |
| `/proposals/*` | `/proposals` (list), `/proposals/:id` (detail) |
| `/reviews/*` | `/reviews` (list), `/reviews/:id` (detail) |
| `/notifications` | Notification feed |
| `/search` | Global search results |
| `/feature-requests` | Feature request portal |
| `/settings/*` | Settings pages (profile, company, locale, invoices, proposals, notifications, subscription, storage) |

**Contracts Routes (Conditional):**

| Route | Additional Gate |
|-------|----------------|
| `/contracts/*` | `ContractsRoute` inside `ProtectedRoute` |
| `/contracts/templates/:id` | Requires `canAccessContracts({ isAdmin })` based on `VITE_CONTRACTS_ACCESS_MODE` |

**Logic:**
- `off`: No one can access
- `admin`: Only `profiles.is_admin = true`
- `on`: All authenticated users

### Admin Routes

**Wrapper:** `ProtectedRoute` + `AdminLayout`

**Gate:** `AdminLayout` fetches `profiles.is_admin`; redirects non-admins to `/dashboard`

| Route | Page |
|-------|------|
| `/admin` (index) | Redirects to `/admin/overview` |
| `/admin/overview` | Admin dashboard |
| `/admin/landing-content` | Landing page CMS |
| `/admin/announcements` | Broadcast announcements |
| `/admin/comms` | System email templates |
| `/admin/branding` | App branding settings |
| `/admin/icons` | Icon slot management |
| `/admin/help-content` | Help articles CMS |
| `/admin/feature-requests` | Moderate feature requests |
| `/admin/feedback` | View user feedback |
| `/admin/system-check` | System health checks (routed but not in sidebar) |

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

**Configuration:** `supabase/config.toml` sets `verify_jwt = false` for most functions; JWT validation done inside functions where needed.

### Billing & Subscription

| Function | Purpose |
|----------|---------|
| `create-checkout-session` | Creates Stripe Checkout session for subscription with 15-day trial |
| `create-portal-session` | Generates Stripe Customer Portal URL |
| `complete-onboarding-after-checkout` | Post-checkout callback; sets `onboarding_completed`, updates trial/subscription data |
| `stripe-webhook` | Handles Stripe events: `customer.subscription.*`, updates `profiles` subscription status |
| `billing-health` | Admin diagnostic: checks subscription states, Stripe sync |

### Account Management

| Function | Purpose |
|----------|---------|
| `delete-account` | Deletes user account + all related data (cascades via RLS/triggers); sends confirmation email |
| `send-account-deleted` | Sends "account deleted" confirmation via Resend |

### Invoices

| Function | Purpose |
|----------|---------|
| `send-invoice` | Generates PDF with jsPDF, sends email via Resend with attachment |
| `view-invoice-pdf` | Public/signed URL for viewing invoice PDF (for portal) |

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
| `send-trial-reminders` | Cron job: sends trial expiry emails (5 days, 1 day, day-of); also callable by admin for testing |
| `send-deadline-notifications` | Cron job: sends due/overdue notifications for projects, tasks, invoices, contracts |
| `send-announcement` | Admin broadcasts announcement to users |
| `send-feedback-notification` | Notifies admin of new feedback submission |
| `send-contact-message` | Contact form submission (landing page) |
| `sync-users-to-resend` | Syncs user email + marketing preferences to Resend audience; runs on onboarding + pref changes |

### Miscellaneous

| Function | Purpose |
|----------|---------|
| `generate-client-summary` | Optional AI-powered client summary (may use OpenAI/LLM) |

### Cron Jobs (pg_cron)

Set up via migrations:

| Schedule | Function | Purpose |
|----------|----------|---------|
| Every 12 hours | `send-trial-reminders` | Check for upcoming trial expirations |
| Every 6 hours | `send-deadline-notifications` | Check for due/overdue items |
| Daily at 2 AM | `sync-users-to-resend` | Sync marketing preferences |

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
- **Edge Functions**: 30+ Deno functions for server-side logic

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
- **Checkout:** `create-checkout-session` Edge Function creates session with trial
- **Customer Portal:** `create-portal-session` generates portal link for subscription management
- **Webhooks:** `stripe-webhook` handles subscription lifecycle events
- **Price IDs:** Configured via `VITE_STRIPE_PRICE_MONTHLY` and `VITE_STRIPE_PRICE_ANNUAL`

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
│   │   ├── Proposals.tsx       # NEW
│   │   ├── ProposalDetail.tsx  # NEW
│   │   ├── Contracts.tsx       # NEW
│   │   ├── ContractDetail.tsx  # NEW
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
│   │   │   ├── ProfileSettings.tsx
│   │   │   ├── CompanySettings.tsx
│   │   │   ├── LocaleSettings.tsx
│   │   │   ├── InvoiceSettings.tsx
│   │   │   ├── ProposalSettings.tsx  # NEW
│   │   │   ├── NotificationSettings.tsx
│   │   │   ├── SubscriptionSettings.tsx
│   │   │   └── StorageSettings.tsx
│   │   ├── admin/
│   │   │   ├── AdminOverview.tsx
│   │   │   ├── LandingContentSettings.tsx
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
│   │   ├── utils.ts             # cn(), etc.
│   │   ├── billing.ts           # Billing helpers
│   │   ├── userStorage.ts       # Storage limit logic
│   │   ├── invoiceNumbering.ts  # Invoice number generation
│   │   ├── csvHelpers.ts        # CSV import/export
│   │   ├── locale-data.ts       # Currency/timezone data
│   │   ├── site-url.ts          # URL generation
│   │   └── ...
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
│   ├── migrations/              # 69 SQL migration files
│   ├── functions/               # 30+ Edge Functions (Deno)
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
| Profile photo | **500 KB** | Form validation in `ProfileSettings.tsx` |
| Business logo | **1 MB** | Form validation in `CompanySettings.tsx` |
| Proposal cover | **10 MB** | Form validation in `ProposalSettings.tsx` |
| Trial period | **15 days** | Set in Stripe checkout session |
| Invoice number padding | **1-6 digits** | Clamped in settings form |
| Proposal validity | **Minimum 1 day** | Zod validation |
| Service price | **Must be > 0** if provided | Zod validation |

### Business Rules

| Rule | Implementation |
|------|----------------|
| **Billing gate** | Expired trial blocks all routes except `/settings/subscription` via `ProtectedRoute` |
| **Contract lock** | After `sent_at` is set, core fields immutable via DB trigger |
| **Invoice numbering** | Atomic via `next_invoice_number()` RPC with row lock on `profiles` |
| **Client archiving** | Soft delete with `archived_at`; hard delete only if no related records |
| **Follow-up title** | Required, minimum 1 character (DB constraint) |
| **Contracts access** | Gated by `VITE_CONTRACTS_ACCESS_MODE` env variable |
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

## What's New Since April 2026

### Major Features Added (May 2026)

1. **Services Catalog** (`/services`)
   - Reusable service offerings
   - Pricing + recurring billing info
   - Default task checklists
   - Used in proposals and contracts

2. **Proposals (Beta)** (`/proposals`, `/proposals/:id`)
   - Full proposal builder with cover images
   - Public proposal viewing (`/proposal/:token`)
   - Client acceptance flow
   - Proposal settings page
   - Auto-generated identifiers: `P-YYYY-#####`
   - Payment structure options (upfront/installments)
   - Client snapshot for historical accuracy

3. **Contracts (Beta)** (`/contracts`, `/contracts/:id`)
   - Contract templates system
   - Dual-party signing workflow
   - OTP verification for client signatures
   - Import from accepted proposals
   - Contract locking after send
   - Auto-generated identifiers: `C-YYYY-#####`
   - Public contract view/sign (`/contract/:token`)
   - Feature flag system (`VITE_CONTRACTS_ACCESS_MODE`)
   - Lance Service Agreement disclaimer

4. **Client Portal** (`/portal/:token`)
   - Token-based client access (no login)
   - Configurable sections per client
   - Portal settings in client detail
   - Sections: Details, Invoices, Proposals, Contracts, Approvals, Time
   - Portal invoice detail view

5. **Client Follow-Ups** (`client_follow_ups` table)
   - Multiple follow-up tasks per client
   - Replace single `next_follow_up_at` field
   - Title, details, due date, remind date
   - Mark complete workflow
   - Displayed on dashboard

6. **Client Enhancements**
   - Client archiving (soft delete with `archived_at`)
   - Client logo upload (`client-logos` bucket)
   - AI client summary generation
   - Client snapshot in proposals/contracts

7. **Invoice Improvements**
   - Invoice ↔ time entry links table (audit trail)
   - Atomic invoice numbering via RPC
   - Invoice number: `next_invoice_number()` function with row lock

8. **Notifications System**
   - Cron jobs for deadline notifications
   - Trial reminder automation
   - Realtime channel for unread count
   - Event key deduplication

9. **Admin Features**
   - Landing Content settings page
   - Comms & Templates management
   - System Check page (trial reminders, billing health)

10. **Other**
    - Brand Guidelines public page
    - Email template rebrand ("Get Lance")
    - Proposal settings page
    - Storage limit increased to 200 MB
    - Contract deadline notifications
    - Marketing preferences sync to Resend

### Database Changes

**New Tables:**
- `services`
- `proposals`, `proposal_services`
- `contracts`, `contract_services`, `contract_templates`, `contract_sign_tokens`
- `client_follow_ups`
- `invoice_time_entry_links`

**New Columns:**
- `clients`: `archived_at`, `logo_url`, `portal_enabled`, `portal_token`, `portal_sections`
- `profiles`: Multiple proposal default fields
- Various snapshot and lock fields on proposals/contracts

**New Buckets:**
- `client-logos`
- `proposal-images`

**New Functions:**
- `next_invoice_number()` - Atomic numbering
- `prevent_contract_updates_after_send()` - Contract lock trigger

### Routes Added

- `/services`
- `/proposals`, `/proposals/:id`
- `/proposal/:token` (public)
- `/contracts`, `/contracts/:id`, `/contracts/templates/:id`
- `/contract/:token` (public)
- `/portal/:token`
- `/portal/:portalToken/invoice/:invoiceId`
- `/settings/proposals`
- `/admin/landing-content`
- `/admin/comms`
- `/admin/system-check`

### Edge Functions Added

- Proposal: `send-proposal`, `view-proposal`, `accept-proposal`
- Contract: `send-contract-otp`, `verify-contract-otp`, `get-contract`, `update-contract-client-details`, `cancel-contract`
- Portal: `view-client-portal`, `send-client-portal-link`
- Misc: `generate-client-summary`

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
