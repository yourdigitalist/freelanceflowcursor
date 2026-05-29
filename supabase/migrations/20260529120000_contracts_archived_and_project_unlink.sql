-- Archive contracts (hide from default list) and allow clearing project/client links
-- when a parent row is deleted or a contract is archived.

alter table public.contracts
  add column if not exists archived_at timestamptz;

create index if not exists contracts_user_archived_idx
  on public.contracts (user_id, archived_at)
  where archived_at is null;

create or replace function public.contracts_lock_after_send()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('pending_signatures', 'signed', 'cancelled') then
    if (new.client_id is distinct from old.client_id)
      and not (new.client_id is null and old.client_id is not null)
    then
      raise exception 'Contract is read-only after it has been sent.';
    end if;

    if (new.project_id is distinct from old.project_id)
      and not (new.project_id is null and old.project_id is not null)
    then
      raise exception 'Contract is read-only after it has been sent.';
    end if;

    if (new.proposal_id is distinct from old.proposal_id)
      and not (new.proposal_id is null and old.proposal_id is not null)
    then
      raise exception 'Contract is read-only after it has been sent.';
    end if;

    if (new.identifier is distinct from old.identifier)
      or (new.client_name is distinct from old.client_name)
      or (new.client_email is distinct from old.client_email)
      or (new.client_phone is distinct from old.client_phone)
      or (new.client_address is distinct from old.client_address)
      or (new.client_city is distinct from old.client_city)
      or (new.client_state is distinct from old.client_state)
      or (new.client_zip is distinct from old.client_zip)
      or (new.client_country is distinct from old.client_country)
      or (new.client_entity_type is distinct from old.client_entity_type)
      or (new.freelancer_name is distinct from old.freelancer_name)
      or (new.freelancer_email is distinct from old.freelancer_email)
      or (new.freelancer_phone is distinct from old.freelancer_phone)
      or (new.freelancer_address is distinct from old.freelancer_address)
      or (new.freelancer_city is distinct from old.freelancer_city)
      or (new.freelancer_state is distinct from old.freelancer_state)
      or (new.freelancer_zip is distinct from old.freelancer_zip)
      or (new.freelancer_country is distinct from old.freelancer_country)
      or (new.timeline_days is distinct from old.timeline_days)
      or (new.reminder_near_end is distinct from old.reminder_near_end)
      or (new.immediate_availability is distinct from old.immediate_availability)
      or (new.payment_structure is distinct from old.payment_structure)
      or (new.installment_description is distinct from old.installment_description)
      or (new.payment_methods is distinct from old.payment_methods)
      or (new.payment_link is distinct from old.payment_link)
      or (new.additional_clause is distinct from old.additional_clause)
      or (new.subtotal is distinct from old.subtotal)
      or (new.discount is distinct from old.discount)
      or (new.discount_type is distinct from old.discount_type)
      or (new.total is distinct from old.total)
    then
      raise exception 'Contract is read-only after it has been sent.';
    end if;
  end if;

  if new.project_id is not null and new.client_id is not null then
    if not exists (
      select 1
      from public.projects p
      where p.id = new.project_id
        and p.client_id = new.client_id
    ) then
      raise exception 'Selected project is not linked to selected client.';
    end if;
  end if;

  return new;
end;
$$;
