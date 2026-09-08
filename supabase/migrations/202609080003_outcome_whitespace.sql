-- Match ECMAScript String.trim whitespace explicitly instead of locale-dependent
-- POSIX space classes. Preserve old notes/history, enforcing future writes only.
begin;
alter table public.control_actions drop constraint control_actions_closed_outcome;
alter table public.control_actions add constraint control_actions_closed_outcome
  check (status not in ('Resolved', 'Dismissed') or
    length(btrim(note, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')) > 0)
  not valid;
commit;
