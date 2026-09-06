-- Foundation only. Apply to a dedicated Supabase development project first.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  currency text not null check (currency in ('AUD','USD','GBP','CAD','NZD')),
  created_at timestamptz not null default now()
);
create table public.memberships (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  primary key (business_id,user_id)
);
create index memberships_user on public.memberships(user_id,business_id);

create function private.can_access_business(target uuid, require_write boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.business_id = target and m.user_id = (select auth.uid())
      and (not require_write or m.role in ('owner','editor'))
  );
$$;
revoke all on function private.can_access_business(uuid, boolean) from public, anon;
grant execute on function private.can_access_business(uuid, boolean) to authenticated;

create table public.control_actions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  owner_label text not null default '' check (length(owner_label) <= 100),
  due_date date,
  status text not null default 'Open' check (status in ('Open','Investigating','Resolved','Dismissed')),
  note text not null default '' check (length(note) <= 1000),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index control_actions_business on public.control_actions(business_id);

alter table public.businesses enable row level security;
alter table public.memberships enable row level security;
alter table public.control_actions enable row level security;
revoke all on public.businesses, public.memberships, public.control_actions from anon, authenticated;
grant select on public.businesses, public.memberships to authenticated;
grant select, insert on public.control_actions to authenticated;
grant update (title, owner_label, due_date, status, note) on public.control_actions to authenticated;

create policy business_member_read on public.businesses for select to authenticated
  using (private.can_access_business(id));
create policy own_memberships_read on public.memberships for select to authenticated
  using (user_id = (select auth.uid()));
create policy action_member_read on public.control_actions for select to authenticated
  using (private.can_access_business(business_id));
create policy action_editor_insert on public.control_actions for insert to authenticated
  with check (private.can_access_business(business_id, true) and created_by = (select auth.uid()));
create policy action_editor_update on public.control_actions for update to authenticated
  using (private.can_access_business(business_id, true))
  with check (private.can_access_business(business_id, true));

create function private.touch_action() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function private.touch_action() from public;
create trigger action_updated before update on public.control_actions
for each row execute function private.touch_action();
-- No client business/member provisioning or deletes. Trusted provisioning only.
-- No raw import storage, buckets, financial upload endpoint or public data grants.
