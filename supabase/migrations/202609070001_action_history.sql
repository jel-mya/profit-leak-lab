-- Updates use compare-and-swap RPC; history is written in the same transaction.
alter table public.control_actions add column revision bigint not null default 1
  check (revision > 0);

create table public.action_events (
  id bigint generated always as identity primary key,
  action_id uuid not null references public.control_actions(id),
  business_id uuid not null references public.businesses(id),
  revision bigint not null check (revision > 0),
  event_type text not null check (event_type in ('baseline','created','updated')),
  actor_id uuid,
  recorded_at timestamptz not null default clock_timestamp(),
  before_state jsonb,
  after_state jsonb not null,
  unique (action_id, revision)
);
create index action_events_business on public.action_events(business_id, action_id);
alter table public.action_events enable row level security;
revoke all on public.action_events from public, anon, authenticated;
grant select on public.action_events to authenticated;
create policy action_events_member_read on public.action_events for select to authenticated
  using (private.can_access_business(business_id));

-- Explicitly labelled migration baseline, not invented historical events.
insert into public.action_events(action_id,business_id,revision,event_type,after_state)
select id,business_id,revision,'baseline',to_jsonb(a) from public.control_actions a;

create or replace function private.touch_action() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.business_id is distinct from old.business_id
    or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
    raise exception 'Action identity is immutable' using errcode = '23514';
  end if;
  new.revision = old.revision + 1;
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create function private.record_action_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.action_events(action_id,business_id,revision,event_type,actor_id,before_state,after_state)
  values (new.id,new.business_id,new.revision,
    case when tg_op = 'INSERT' then 'created' else 'updated' end,
    auth.uid(), case when tg_op = 'UPDATE' then to_jsonb(old) else null end, to_jsonb(new));
  return new;
end;
$$;
revoke all on function private.record_action_event() from public, anon, authenticated;
create trigger action_history after insert or update on public.control_actions
for each row execute function private.record_action_event();

-- Restrict inserts too: client-supplied IDs, authors, timestamps and revision
-- must never replace the database defaults.
revoke insert, update on public.control_actions from authenticated;
revoke update (title,owner_label,due_date,status,note) on public.control_actions from authenticated;
grant insert (business_id,title,owner_label,due_date,status,note) on public.control_actions to authenticated;

create function public.update_control_action(
  p_action_id uuid, p_expected_revision bigint,
  p_title text, p_owner_label text, p_due_date date, p_status text, p_note text
) returns public.control_actions
language plpgsql security definer set search_path = '' as $$
declare
  previous public.control_actions;
  result public.control_actions;
begin
  if auth.uid() is null then
    raise exception 'Action unavailable or not editable' using errcode = '42501';
  end if;
  -- Explicit authorisation is mandatory: SECURITY DEFINER bypasses table RLS.
  -- Lock membership as well as the action so revocation and writes serialize.
  select a.* into previous
  from public.control_actions a join public.memberships m on m.business_id = a.business_id
  where a.id = p_action_id and m.user_id = auth.uid() and m.role in ('owner','editor')
  for update of a for share of m;
  if not found then
    raise exception 'Action unavailable or not editable' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision <> previous.revision then
    raise exception 'Action changed; reload before saving' using errcode = 'PT409';
  end if;
  update public.control_actions set title = p_title, owner_label = p_owner_label,
    due_date = p_due_date, status = p_status, note = p_note
    where id = previous.id returning * into result;
  return result;
end;
$$;
revoke all on function public.update_control_action(uuid,bigint,text,text,date,text,text) from public, anon;
grant execute on function public.update_control_action(uuid,bigint,text,text,date,text,text) to authenticated;
