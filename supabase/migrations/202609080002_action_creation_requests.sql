-- Request keys are scoped to the authenticated caller, never a supplied user ID.
create table private.action_creation_requests (
  user_id uuid not null references auth.users(id),
  request_id uuid not null,
  business_id uuid not null references public.businesses(id),
  action_id uuid not null unique references public.control_actions(id),
  original_payload jsonb not null,
  primary key (user_id, request_id)
);
alter table private.action_creation_requests enable row level security;
revoke all on private.action_creation_requests from public, anon, authenticated;

create function public.create_control_action(
  p_request_id uuid, p_business_id uuid, p_title text, p_owner_label text,
  p_due_date date, p_status text, p_note text
) returns public.control_actions
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  payload jsonb;
  previous private.action_creation_requests;
  result public.control_actions;
begin
  if caller is null then
    raise exception 'Action unavailable or not editable' using errcode = '42501';
  end if;
  if p_request_id is null then
    raise exception 'Creation request key required' using errcode = '22023';
  end if;
  -- Serialize matching keys; hash collisions only add waiting, not access.
  perform pg_advisory_xact_lock(hashtextextended(caller::text || ':' || p_request_id::text, 0));
  -- Check and lock membership on every call, including successful replays.
  perform 1 from public.memberships m where m.business_id = p_business_id
    and m.user_id = caller and m.role in ('owner', 'editor') for share;
  if not found then
    raise exception 'Action unavailable or not editable' using errcode = '42501';
  end if;
  payload := jsonb_build_object('title',p_title,'owner_label',p_owner_label,
    'due_date',p_due_date,'status',p_status,'note',p_note);
  select * into previous from private.action_creation_requests r
    where r.user_id = caller and r.request_id = p_request_id;
  if found then
    if previous.business_id <> p_business_id or previous.original_payload is distinct from payload then
      raise exception 'Creation request already used with different values' using errcode = 'PT409';
    end if;
    -- Return current state without overwriting any later edits or adding history.
    select * into result from public.control_actions a where a.id = previous.action_id;
    if not found then raise exception 'Action unavailable' using errcode = '42501'; end if;
    return result;
  end if;
  insert into public.control_actions(business_id,title,owner_label,due_date,status,note)
    values(p_business_id,p_title,p_owner_label,p_due_date,p_status,p_note) returning * into result;
  insert into private.action_creation_requests(user_id,request_id,business_id,action_id,original_payload)
    values(caller,p_request_id,p_business_id,result.id,payload);
  return result;
end;
$$;
revoke all on function public.create_control_action(uuid,uuid,text,text,date,text,text) from public, anon;
grant execute on function public.create_control_action(uuid,uuid,text,text,date,text,text) to authenticated;
