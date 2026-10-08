-- ============================================================================
-- CampusFlow - Event Organiser role model
-- Replaces the old Faculty / Club / Administrator workflow with two product roles:
--   student   -> participates in campus life
--   organizer -> manages the complete event ecosystem
--
-- System-level administration is intentionally not exposed by the application.
-- This migration also keeps the legacy helper names temporarily so older
-- database policies remain compatible while their effective permission is the
-- Event Organiser role.
-- ============================================================================

-- 1. Normalize any existing staff accounts to the new role.
update public.profiles
set role = 'organizer'
where role in ('faculty', 'admin');

-- 2. Replace the role constraint.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'organizer'));

-- 3. New canonical role helper.
create or replace function public.is_organizer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'organizer', false)
$$;

-- 4. Legacy helper aliases. Existing RLS policies from earlier migrations
-- continue to work, but both now resolve to the single organizer role.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_organizer()
$$;

create or replace function public.is_faculty()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_organizer()
$$;

-- Every organiser is authorized to manage the campus event ecosystem.
create or replace function public.owns_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_organizer()
     and exists (select 1 from public.events e where e.id = p_event_id)
$$;

-- 5. New users remain students by default. Organiser accounts are promoted
-- intentionally by the events office using the supplied promotion SQL.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_department uuid;
begin
  begin
    v_department := nullif(new.raw_user_meta_data ->> 'department_id', '')::uuid;
  exception when others then
    v_department := null;
  end;

  if v_department is not null
     and not exists (
       select 1 from public.departments d
       where d.id = v_department and d.is_active
     ) then
    v_department := null;
  end if;

  insert into public.profiles (
    id, email, full_name, role, status, department_id
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    'student',
    'active',
    v_department
  )
  on conflict (id) do nothing;

  return new;
end
$$;

-- 6. Profile security: users can edit their own profile fields, but nobody
-- can change roles/status through the normal application profile update.
create or replace function public.guard_profile_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if new.id is distinct from old.id then
      raise exception 'CF_FORBIDDEN: A profile id cannot be changed.';
    end if;

    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.email is distinct from old.email then
      raise exception 'CF_FORBIDDEN: Role, account status and login email cannot be changed here.';
    end if;
  end if;

  return new;
end
$$;

-- 7. Remove the old "last administrator" hardening semantics. There is no
-- administrator role in the product anymore.

-- 8. Event lifecycle: organisers can directly create, publish, edit and
-- cancel events. There is no approval queue between the organiser and students.
create or replace function public.guard_event_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if not public.is_organizer() then
    raise exception 'CF_FORBIDDEN: Only an Event Organiser can manage events.';
  end if;

  if tg_op = 'INSERT' then
    new.organizer_id := auth.uid();
    new.created_by := auth.uid();
    new.approved_by := null;
    new.approved_at := null;
    new.decided_at := null;

    if new.status = 'pending_approval' then
      new.status := 'approved';
    end if;

    if new.status = 'rejected' then
      raise exception 'CF_FORBIDDEN_STATUS: Rejected is a historical state and cannot be created directly.';
    end if;

    if new.status = 'approved' then
      new.approved_by := auth.uid();
      new.approved_at := now();
      new.decided_at := now();
    end if;

    return new;
  end if;

  new.organizer_id := old.organizer_id;
  new.created_by := old.created_by;
  new.legacy_id := old.legacy_id;

  if new.status = 'pending_approval' then
    new.status := 'approved';
  end if;

  if new.status = 'approved' and old.status <> 'approved' then
    new.approved_by := auth.uid();
    new.approved_at := now();
    new.decided_at := now();
  end if;

  if new.status = 'rejected' then
    raise exception 'CF_FORBIDDEN_STATUS: Events are managed directly by the organiser; rejection is not used.';
  end if;

  return new;
end
$$;

-- 9. Existing policies that referenced is_admin/is_faculty now resolve to
-- organizer. Remove the old admin-only profile update policy so organisers
-- cannot promote or deactivate accounts through the application.
drop policy if exists profiles_update_admin on public.profiles;

-- Organisers can read the people needed to manage registrations/attendance,
-- while students continue to see only their own profile.
drop policy if exists profiles_read_admin on public.profiles;
create policy profiles_read_organizer on public.profiles
  for select to authenticated
  using (public.is_organizer() or id = auth.uid());

-- 10. Make organiser-created events immediately visible when published.
-- The existing public visibility function already handles approved and live
-- states, so no public-data policy changes are needed.

-- 11. Explicit organizer policies for clubs. The legacy policies remain safe,
-- but these names make the new permission model self-documenting.
drop policy if exists clubs_admin on public.clubs;
create policy clubs_organizer on public.clubs
  for all to authenticated
  using (public.is_organizer())
  with check (public.is_organizer());

-- Reference data used by organisers.
drop policy if exists departments_admin on public.departments;
create policy departments_organizer on public.departments
  for all to authenticated
  using (public.is_organizer())
  with check (public.is_organizer());

drop policy if exists categories_admin on public.event_categories;
create policy categories_organizer on public.event_categories
  for all to authenticated
  using (public.is_organizer())
  with check (public.is_organizer());

drop policy if exists venues_admin on public.venues;
create policy venues_organizer on public.venues
  for all to authenticated
  using (public.is_organizer())
  with check (public.is_organizer());

-- 12. Prevent stale approval terminology from blocking organizer writes.
drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert to authenticated
  with check (public.is_organizer() and organizer_id = auth.uid());

drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update to authenticated
  using (public.is_organizer())
  with check (public.is_organizer());

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete to authenticated
  using (public.is_organizer());

-- 13. Organizer can manage registrations, attendance, certificates,
-- announcements and gallery for the whole campus through the existing
-- ownership-aware policies.
