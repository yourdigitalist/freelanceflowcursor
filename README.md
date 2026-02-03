# FreelanceFlow

Manage your freelance business in one place: clients, projects, tasks, time tracking, invoices, and client review requests.

**New to this?** → See **[GETTING_STARTED.md](./GETTING_STARTED.md)** for a step-by-step guide (no coding experience needed).

## Tech stack

- **Frontend:** React 18, TypeScript, Vite
- **UI:** Tailwind CSS, shadcn/ui (Radix), Lucide icons
- **Backend / Auth:** Supabase (PostgreSQL, Auth, Edge Functions)
- **State / Data:** TanStack Query, React Hook Form, Zod

## What’s in the app

- **Auth** – Sign up, sign in, password reset (Supabase Auth)
- **Onboarding** – First-time profile setup
- **Dashboard** – Overview of clients, projects, hours, invoices
- **Clients** – CRUD, status (active / inactive / lead)
- **Projects** – Linked to clients, Kanban tasks, status, budget, dates
- **Tasks** – Kanban (Todo / In progress / Review / Done), priority, due dates
- **Time tracking** – Entries per project/task, billable flag, hourly rate
- **Invoices** – Create from time/items, send (Resend), status (draft / sent / paid / overdue)
- **Review requests** – Send review links to clients; clients comment and upload files
- **Settings** – User, business, invoice, locale, subscription

## Run locally

1. **Clone and install**

   ```bash
   git clone <your-repo-url>
   cd repo-to-show-main
   npm install
   ```

2. **Supabase**

   - Create a [Supabase](https://supabase.com) project.
   - Run the SQL in `supabase/migrations/` in order (Supabase SQL Editor or `supabase db push` if using Supabase CLI).
   - In Supabase: Authentication → URL Configuration, set Site URL and Redirect URLs if needed (e.g. `http://localhost:8080`).

3. **Environment**

   Copy `.env.example` to `.env` and set your Supabase values (from Project Settings → API):

   ```bash
   cp .env.example .env
   ```

   - `VITE_SUPABASE_URL` – Project URL  
   - `VITE_SUPABASE_PUBLISHABLE_KEY` – anon public key  

   Optional: `VITE_SUPABASE_PROJECT_ID` for reference.

4. **Dev server**

   ```bash
   npm run dev
   ```

   App runs at `http://localhost:8080` (or the port Vite prints).

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start Vite dev server    |
| `npm run build`| Production build         |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint               |
| `npm run test` | Run Vitest tests         |

## Supabase Edge Functions

The app uses these Edge Functions (see `supabase/functions/`):

- **send-invoice** – Sends invoice emails via Resend (PDF attachment).
- **send-review-request** – Sends review request emails via Resend when you click “Mark as sent” (emails recipients the review link).
- **get-review** – Loads a review request by token (for client review page).
- **update-review-status** – Updates review status.
- **submit-review-comment** – Saves client comments.
- **upload-review-file** – Handles file uploads for reviews.

**Resend:** Set `RESEND_API_KEY` in Supabase Dashboard → Project Settings → Edge Functions → Secrets so that **send-invoice** and **send-review-request** can send email. Without it, invoices and review requests can still be marked as sent and you can share links manually.

Deploy with: `supabase functions deploy` (after `supabase login` and `supabase link`).

## Project structure (high level)

- `src/` – React app  
  - `pages/` – Route pages (Dashboard, Clients, Projects, Invoices, etc.)  
  - `components/` – Layout, tasks (Kanban, filters, etc.), shared UI  
  - `integrations/supabase/` – Supabase client and generated types  
  - `lib/` – Auth context, utils, locale  
- `supabase/migrations/` – Database schema and RLS  
- `supabase/functions/` – Edge Functions  

This project was generated with [Lovable](https://lovable.dev) and extracted to run as a standalone app.
