-- Enforce evidence on future writes without rewriting or inventing legacy notes.
-- NOT VALID preserves old closed rows; every insert/update must satisfy the rule.
alter table public.control_actions add constraint control_actions_closed_outcome
  check (status not in ('Resolved', 'Dismissed') or note ~ '[^[:space:]]') not valid;
