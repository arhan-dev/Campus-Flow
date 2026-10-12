-- CampusFlow security hardening: students and organisers cannot change any
-- account's role, status, or email through the authenticated client.
-- Trusted SQL Editor / migration operations can still make intentional changes.

create or replace function public.guard_profile_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if new.id is distinct from old.id
       or new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.email is distinct from old.email then
      raise exception 'CF_FORBIDDEN: Role, status, and email changes must be performed by a trusted database operator.';
    end if;
  end if;
  return new;
end;
$$;

-- Make the intended account permissions explicit: profile rows may be read
-- by the account owner and by organisers, but authenticated users cannot use
-- an old admin update policy to promote, deactivate, or modify other users.
drop policy if exists profiles_update_admin on public.profiles;

-- Keep owner updates for editable profile fields; guard_profile_write blocks
-- changes to id, role, status, and email even for organiser sessions.
