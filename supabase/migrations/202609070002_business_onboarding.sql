-- One self-created starter business per authenticated identity. Further client
-- access must be explicitly provisioned; this endpoint cannot join a tenant.
create table private.business_onboarding (
  user_id uuid primary key references auth.users(id),
  business_id uuid not null unique references public.businesses(id)
);
revoke all on private.business_onboarding from public, anon, authenticated;

create function public.create_business(p_name text, p_currency text)
returns public.businesses language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  clean_name text := btrim(p_name);
  result public.businesses;
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if clean_name is null or length(clean_name) not between 1 and 200
    or p_currency is null or p_currency not in ('AUD','USD','GBP','CAD','NZD') then
    raise exception 'Invalid business name or currency' using errcode = '22023';
  end if;
  -- Serialize repeat submissions for this identity. Hash collisions only cause
  -- extra waiting; they cannot confer membership or bypass the unique mapping.
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
  select b.* into result from private.business_onboarding o
    join public.businesses b on b.id = o.business_id where o.user_id = caller;
  if found then
    -- A revoked owner must not regain access by replaying onboarding.
    if not exists (select 1 from public.memberships m where m.business_id = result.id
      and m.user_id = caller and m.role = 'owner') then
      raise exception 'Business unavailable' using errcode = '42501';
    end if;
    if result.name <> clean_name or result.currency <> p_currency then
      raise exception 'Starter business already exists; reload it before continuing' using errcode = 'PT409';
    end if;
    return result;
  end if;
  insert into public.businesses(name,currency) values (clean_name,p_currency) returning * into result;
  insert into public.memberships(business_id,user_id,role) values (result.id,caller,'owner');
  insert into private.business_onboarding(user_id,business_id) values (caller,result.id);
  return result;
end;
$$;
revoke all on function public.create_business(text,text) from public, anon;
grant execute on function public.create_business(text,text) to authenticated;
