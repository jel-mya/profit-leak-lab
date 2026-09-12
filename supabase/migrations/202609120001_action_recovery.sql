-- Optional user-reported recovery fields; existing rows remain unchanged.
begin;
alter table public.control_actions
  add column recovery_amount bigint,
  add column recovery_currency text,
  add column recovery_date date,
  add column recovery_evidence text,
  add constraint control_actions_recovery_complete check (
    (recovery_amount is null and recovery_currency is null and recovery_date is null and recovery_evidence is null)
    or (recovery_amount is not null and recovery_currency is not null and recovery_date is not null and recovery_evidence is not null
      and recovery_amount between 0 and 100000000000
      and recovery_currency in ('AUD','USD','GBP','CAD','NZD')
      and recovery_date between date '0001-01-01' and date '9999-12-31'
      and length(recovery_evidence) <= 1000
      and length(btrim(recovery_evidence, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')) > 0)
  );
create function public.record_action_recovery(
  p_action_id uuid, p_expected_revision bigint, p_amount bigint,
  p_currency text, p_date date, p_evidence text
) returns public.control_actions
language plpgsql security definer set search_path = '' as $$
declare
  previous public.control_actions;
  business_currency text;
  result public.control_actions;
begin
  if auth.uid() is null then
    raise exception 'Action unavailable or not editable' using errcode = '42501';
  end if;
  select a.* into previous
    from public.control_actions a
    join public.memberships m on m.business_id = a.business_id
    join public.businesses b on b.id = a.business_id
    where a.id = p_action_id and m.user_id = auth.uid() and m.role in ('owner','editor')
    for update of a for share of m, b;
  if not found then
    raise exception 'Action unavailable or not editable' using errcode = '42501';
  end if;
  if p_expected_revision is null or p_expected_revision <> previous.revision then
    raise exception 'Action changed; reload before saving' using errcode = 'PT409';
  end if;
  select currency into business_currency from public.businesses where id = previous.business_id;
  if p_currency is distinct from business_currency then
    raise exception 'Recovery currency must match the business' using errcode = '22023';
  end if;
  update public.control_actions set recovery_amount = p_amount, recovery_currency = p_currency,
    recovery_date = p_date, recovery_evidence = p_evidence
    where id = previous.id returning * into result;
  return result;
end;
$$;
revoke all on function public.record_action_recovery(uuid,bigint,bigint,text,date,text) from public, anon;
grant execute on function public.record_action_recovery(uuid,bigint,bigint,text,date,text) to authenticated;
commit;
