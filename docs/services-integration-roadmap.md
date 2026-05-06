# Services Integration Roadmap

This document outlines the next schema/app steps after the Services MVP.

## Goals

- Keep Services reusable across Projects, Invoices, Proposals, and Contracts.
- Preserve historical commercial data even when service templates change later.
- Avoid regressions by using additive migrations and relation-safe RLS policies.

## Phase A: Connect Services to Projects

Add a join table:

- `public.project_services`
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid not null references auth.users(id) on delete cascade`
  - `project_id uuid not null references public.projects(id) on delete cascade`
  - `service_id uuid not null references public.services(id) on delete restrict`
  - `name_override text`
  - `description_override text`
  - `price_override numeric`
  - `is_recurring_override boolean`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`

Key behavior:

- Allow multiple services per project.
- Use overrides per project without mutating the base service.
- Seed project tasks from `services.default_tasks` when attached.

## Phase B: Connect Services to Invoices

Extend invoice items:

- `alter table public.invoice_items add column service_id uuid references public.services(id) on delete set null;`

Key behavior:

- Keep `description`, `quantity`, `unit_price`, and `amount` as snapshots on invoice items.
- Use `service_id` for analytics and quick item creation, not as the only source of truth.

## Phase C: Future Proposals and Contracts

When proposals/contracts are added:

- Include nullable `service_id` plus snapshot fields (`name`, `description`, `price`, cadence).
- Never rely on mutable service fields for historical contract terms.

## RLS and Data Safety Notes

- Use existing ownership patterns (`(select auth.uid()) = user_id`) for parent tables.
- For child tables without `user_id`, use `exists` ownership checks through parent row.
- Add indexes on foreign keys for join and delete performance.
