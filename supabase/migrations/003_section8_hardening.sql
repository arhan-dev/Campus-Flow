-- ============================================================================
-- CampusFlow - Section 8 hardening migration (Supabase / PostgreSQL)
-- Run ONCE, in the SQL Editor, AFTER 002_section7.sql.
--
-- Only one change, and it does not loosen any rule:
--
-- guard_profile_write(): the "last active administrator" rule counted the OTHER admins from a snapshot.
-- Two admins demoting each other in the same instant could both pass the check and leave NO active admin.
-- The function below is identical to the Section 7 version except that every change that could remove an
-- active admin first takes a transaction-level advisory lock, so such changes run one after another and
-- the second one sees the first one's result.
-- ============================================================================
create or replace function public.guard_profile_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_other_admins integer;
begin
  if auth.uid() is not null then
    if new.id is distinct from old.id then
      raise exception 'CF_FORBIDDEN: A profile id cannot be changed.';
    end if;
    if not public.is_admin() then
      if new.role is distinct from old.role
         or new.status is distinct from old.status
         or new.email is distinct from old.email then
        raise exception 'CF_FORBIDDEN: You cannot change your role, status or email.';
      end if;
    else
      if old.id = auth.uid() and (new.role is distinct from old.role or new.status is distinct from old.status) then
        raise exception 'CF_SELF_CHANGE: You cannot change your own role or account status.';
      end if;
      if old.role = 'admin' and old.status = 'active' and (new.role <> 'admin' or new.status <> 'active') then
        perform pg_advisory_xact_lock(hashtext('campusflow.last_admin'));
        select count(*) into v_other_admins from public.profiles p
          where p.role = 'admin' and p.status = 'active' and p.id <> old.id;
        if v_other_admins < 1 then
          raise exception 'CF_LAST_ADMIN: At least one active administrator must remain.';
        end if;
      end if;
    end if;
  end if;
  return new;
end $$;
