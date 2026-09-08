-- Match the tenant-filtered, ID-ordered page query used by the workspace adapter.
-- The composite prefix also supports existing business-only lookups.
begin;
create index control_actions_business_id on public.control_actions(business_id, id);
drop index public.control_actions_business;
commit;
