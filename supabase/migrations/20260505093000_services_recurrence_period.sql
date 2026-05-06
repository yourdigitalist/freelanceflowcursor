alter table public.services
add column if not exists recurrence_period text not null default 'monthly';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'services_recurrence_period_check'
  ) then
    alter table public.services
    add constraint services_recurrence_period_check
    check (recurrence_period in ('monthly', 'annually'));
  end if;
end $$;
