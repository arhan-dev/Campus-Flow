-- ============================================================================
-- CampusFlow - initial schema (Supabase / PostgreSQL)
-- Run this ONCE on a fresh Supabase project (SQL Editor > New query > paste > Run).
-- It creates tables, constraints, indexes, helper functions, triggers,
-- Row Level Security policies and storage buckets.
-- Then run supabase/seed.sql for the starting data.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Reference tables
-- ----------------------------------------------------------------------------
create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  code        text not null unique,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.event_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  icon        text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.venues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  capacity    integer check (capacity is null or capacity > 0),
  location    text,
  description text,
  status      text not null default 'available' check (status in ('available', 'maintenance')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.clubs (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  description   text,
  category      text,
  department_id uuid references public.departments (id) on delete set null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. Profiles (one row per Supabase Auth user)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text not null default '',
  role           text not null default 'student' check (role in ('student', 'faculty', 'admin')),
  status         text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  department_id  uuid references public.departments (id) on delete set null,
  email          text,
  avatar_url     text,
  year_of_study  text check (year_of_study is null or year_of_study in ('1st Year', '2nd Year', '3rd Year', '4th Year')),
  phone          text,
  student_number text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. Events
-- ----------------------------------------------------------------------------
create table public.events (
  id                    uuid primary key default gen_random_uuid(),
  legacy_id             integer unique, -- id used by the old mock data, kept as a stable mapping for seeded events
  title                 text not null check (length(trim(title)) > 0),
  description           text not null default '',
  category_id           uuid not null references public.event_categories (id),
  organizer_id          uuid references public.profiles (id) on delete set null,
  club_id               uuid references public.clubs (id) on delete set null,
  department_id         uuid references public.departments (id) on delete set null,
  venue_id              uuid references public.venues (id) on delete set null,
  event_date            date not null,
  start_time            time not null,
  end_time              time,
  capacity              integer not null check (capacity > 0),
  registration_deadline date,
  poster_url            text,
  status                text not null default 'draft' check (status in (
                          'draft', 'pending_approval', 'approved', 'registration_open',
                          'registration_closed', 'ongoing', 'completed', 'rejected')),
  rejection_reason      text,
  rules                 text[] not null default '{}',
  prizes                text[] not null default '{}',
  schedule              jsonb not null default '[]'::jsonb check (jsonb_typeof(schedule) = 'array'),
  contact_name          text,
  contact_email         text,
  contact_phone         text,
  submitted_at          timestamptz,
  decided_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.profiles (id) on delete set null,
  approved_by           uuid references public.profiles (id) on delete set null,
  approved_at           timestamptz,
  constraint events_time_order check (end_time is null or end_time > start_time),
  constraint events_deadline_order check (registration_deadline is null or registration_deadline <= event_date)
);

-- ----------------------------------------------------------------------------
-- 4. Registrations, attendance, certificates
-- ----------------------------------------------------------------------------
create table public.event_registrations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events (id) on delete cascade,
  student_id    uuid not null references public.profiles (id) on delete cascade,
  status        text not null default 'registered' check (status in ('registered', 'cancelled', 'waitlisted')),
  registered_at timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint event_registrations_unique unique (event_id, student_id)
);

create table public.attendance (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events (id) on delete cascade,
  student_id      uuid not null references public.profiles (id) on delete cascade,
  registration_id uuid references public.event_registrations (id) on delete cascade,
  status          text not null check (status in ('present', 'absent')),
  marked_at       timestamptz not null default now(),
  marked_by       uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint attendance_unique unique (event_id, student_id)
);

create sequence public.certificate_number_seq start 1;

create table public.certificates (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references public.events (id) on delete cascade,
  student_id         uuid not null references public.profiles (id) on delete cascade,
  certificate_type   text not null check (certificate_type in ('participation', 'winner', 'runner_up', 'volunteer')),
  certificate_number text unique,
  certificate_url    text, -- stays NULL until real certificate files are generated (later section)
  issued_at          timestamptz not null default now(),
  verification_code  text unique,
  status             text not null default 'issued' check (status in ('issued', 'revoked')),
  verified_at        timestamptz,
  verified_by        uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  constraint certificates_unique unique (event_id, student_id)
);

-- ----------------------------------------------------------------------------
-- 5. Announcements, feedback, points, notifications, gallery
-- ----------------------------------------------------------------------------
create table public.announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (length(trim(title)) > 0),
  message      text not null check (length(trim(message)) > 0),
  event_id     uuid references public.events (id) on delete cascade,
  created_by   uuid not null references public.profiles (id) on delete cascade,
  audience     text not null check (audience in ('registered_participants', 'event_participants', 'department', 'all_students')),
  status       text not null default 'published' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint announcements_event_needed check (audience = 'all_students' or event_id is not null)
);

create table public.feedback (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events (id) on delete cascade,
  student_id          uuid not null references public.profiles (id) on delete cascade,
  organization_rating smallint not null check (organization_rating between 1 and 5),
  content_rating      smallint not null check (content_rating between 1 and 5),
  speaker_rating      smallint not null check (speaker_rating between 1 and 5),
  venue_rating        smallint not null check (venue_rating between 1 and 5),
  overall_rating      smallint not null check (overall_rating between 1 and 5),
  comment             text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint feedback_unique unique (event_id, student_id)
);

create table public.participation_points (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  event_id   uuid not null references public.events (id) on delete cascade,
  points     integer not null check (points > 0),
  reason     text not null check (reason in ('Participation', 'Workshop', 'Hackathon', 'Volunteer', 'Winner', 'Runner-up')),
  created_at timestamptz not null default now(),
  constraint participation_points_unique unique (student_id, event_id, reason)
);

create table public.notifications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  title            text not null,
  message          text not null,
  type             text not null default 'info',
  related_event_id uuid references public.events (id) on delete set null,
  is_read          boolean not null default false,
  created_at       timestamptz not null default now()
);

create table public.event_gallery (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  image_url   text not null,
  caption     text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6. Indexes
-- ----------------------------------------------------------------------------
create index profiles_role_idx            on public.profiles (role);
create index profiles_department_idx      on public.profiles (department_id);
create index events_date_idx              on public.events (event_date);
create index events_status_idx            on public.events (status);
create index events_organizer_idx         on public.events (organizer_id);
create index events_category_idx          on public.events (category_id);
create index events_venue_date_idx        on public.events (venue_id, event_date);
create index registrations_student_idx    on public.event_registrations (student_id);
create index registrations_event_idx      on public.event_registrations (event_id, status);
create index attendance_student_idx       on public.attendance (student_id);
create index attendance_event_idx         on public.attendance (event_id);
create index certificates_student_idx     on public.certificates (student_id);
create index certificates_event_idx       on public.certificates (event_id);
create index announcements_event_idx      on public.announcements (event_id);
create index announcements_created_by_idx on public.announcements (created_by);
create index feedback_event_idx           on public.feedback (event_id);
create index points_student_idx           on public.participation_points (student_id);
create index notifications_user_idx       on public.notifications (user_id, is_read, created_at desc);
create index gallery_event_idx            on public.event_gallery (event_id);

-- ============================================================================
-- 7. Helper functions (used by RLS policies and triggers)
-- Role checks come from the profiles table, never from anything the browser sends.
-- ============================================================================
create or replace function public.is_published_status(p_status text)
returns boolean language sql immutable as $$
  select p_status in ('approved', 'registration_open', 'registration_closed', 'ongoing', 'completed')
$$;

-- The role of the signed-in user, or NULL for anonymous users and inactive accounts
create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = public as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.status = 'active'
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_app_role() = 'admin', false)
$$;

create or replace function public.is_faculty()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_app_role() = 'faculty', false)
$$;

create or replace function public.is_student()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_app_role() = 'student', false)
$$;

-- True when the signed-in faculty member is the organizer of the event
create or replace function public.owns_event(p_event_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_faculty()
     and exists (select 1 from public.events e where e.id = p_event_id and e.organizer_id = auth.uid())
$$;

-- Adds an in-app notification. Only triggers call this; browsers cannot insert notifications.
create or replace function public.push_notification(p_user uuid, p_title text, p_message text, p_type text, p_event uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, title, message, type, related_event_id)
  values (p_user, p_title, p_message, p_type, p_event)
$$;
revoke all on function public.push_notification(uuid, text, text, text, uuid) from public, anon, authenticated;

-- Public seat counts for published events (counts only, no personal data).
-- The view runs with the owner's rights, so students can see how full an event is.
create or replace view public.event_seat_counts as
select e.id as event_id,
       count(r.id) filter (where r.status = 'registered')::integer as registered_count
from public.events e
left join public.event_registrations r on r.event_id = e.id
where public.is_published_status(e.status)
group by e.id;

-- ============================================================================
-- 8. Triggers
-- ============================================================================

-- updated_at bookkeeping
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger venues_updated_at        before update on public.venues              for each row execute function public.set_updated_at();
create trigger profiles_updated_at      before update on public.profiles            for each row execute function public.set_updated_at();
create trigger events_updated_at        before update on public.events              for each row execute function public.set_updated_at();
create trigger registrations_updated_at before update on public.event_registrations for each row execute function public.set_updated_at();
create trigger attendance_updated_at    before update on public.attendance          for each row execute function public.set_updated_at();
create trigger announcements_updated_at before update on public.announcements      for each row execute function public.set_updated_at();
create trigger feedback_updated_at      before update on public.feedback            for each row execute function public.set_updated_at();

-- ---- New auth user -> profile row. The role is ALWAYS 'student'; metadata can never set it. ----
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_department uuid;
begin
  begin
    v_department := nullif(new.raw_user_meta_data ->> 'department_id', '')::uuid;
  exception when others then
    v_department := null;
  end;
  if v_department is not null
     and not exists (select 1 from public.departments d where d.id = v_department and d.is_active) then
    v_department := null;
  end if;

  insert into public.profiles (id, email, full_name, role, status, department_id)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1)),
    'student',
    'active',
    v_department
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---- Users cannot change their own role, status or email ----
create or replace function public.guard_profile_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.id is distinct from old.id
       or new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.email is distinct from old.email then
      raise exception 'CF_FORBIDDEN: You cannot change your role, status or email.';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
for each row execute function public.guard_profile_write();

-- ---- Event lifecycle rules ----
-- Faculty: create drafts, submit for approval, edit their own events.
-- Admin: approve / reject (a rejection needs a reason). approved_by / approved_at are set here, not by the browser.
create or replace function public.guard_event_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_admin boolean;
begin
  if auth.uid() is null then
    return new; -- SQL editor / maintenance context (for example the seed file)
  end if;
  v_admin := public.is_admin();

  if tg_op = 'INSERT' then
    if not v_admin then
      if new.status not in ('draft', 'pending_approval') then
        raise exception 'CF_FORBIDDEN_STATUS: A new event can only be saved as a draft or submitted for approval.';
      end if;
      new.organizer_id := auth.uid();
      new.created_by := auth.uid();
      new.approved_by := null;
      new.approved_at := null;
      new.decided_at := null;
      new.rejection_reason := null;
    else
      new.created_by := coalesce(new.created_by, auth.uid());
    end if;
    if new.status = 'pending_approval' then
      new.submitted_at := now();
    end if;
    if new.status = 'rejected' and coalesce(trim(new.rejection_reason), '') = '' then
      raise exception 'CF_REASON_REQUIRED: A rejection reason is required.';
    end if;
    return new;
  end if;

  -- UPDATE
  if not v_admin then
    new.organizer_id := old.organizer_id;
    new.created_by := old.created_by;
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    new.decided_at := old.decided_at;
    new.submitted_at := old.submitted_at;
    new.rejection_reason := old.rejection_reason;
    new.legacy_id := old.legacy_id;
    if new.status is distinct from old.status then
      if not (new.status in ('draft', 'pending_approval') and old.status in ('draft', 'pending_approval', 'rejected')) then
        raise exception 'CF_FORBIDDEN_STATUS: Only an admin can change the status of this event.';
      end if;
    end if;
  elsif new.status is distinct from old.status
        and new.status in ('approved', 'rejected')
        and old.status <> 'pending_approval' then
    raise exception 'CF_FORBIDDEN_STATUS: Only events that are pending approval can be approved or rejected.';
  end if;

  if new.status is distinct from old.status then
    if new.status = 'pending_approval' then
      new.submitted_at := now();
      new.decided_at := null;
      new.approved_by := null;
      new.approved_at := null;
    elsif new.status = 'approved' then
      new.approved_by := auth.uid();
      new.approved_at := now();
      new.decided_at := now();
    elsif new.status = 'rejected' then
      new.decided_at := now();
      new.approved_by := null;
      new.approved_at := null;
    end if;
  end if;

  if new.status = 'rejected' then
    if coalesce(trim(new.rejection_reason), '') = '' then
      raise exception 'CF_REASON_REQUIRED: A rejection reason is required.';
    end if;
  else
    new.rejection_reason := null;
  end if;
  return new;
end $$;

create trigger events_guard before insert or update on public.events
for each row execute function public.guard_event_write();

-- Notifications for the approval workflow
create or replace function public.on_event_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_became_pending boolean;
begin
  if tg_op = 'INSERT' then
    v_became_pending := new.status = 'pending_approval';
  else
    v_became_pending := new.status = 'pending_approval' and old.status is distinct from 'pending_approval';
  end if;
  if v_became_pending then
    insert into public.notifications (user_id, title, message, type, related_event_id)
    select p.id, 'Approval needed', new.title || ' is waiting for review.', 'approval', new.id
    from public.profiles p where p.role = 'admin' and p.status = 'active';
  end if;
  if tg_op = 'UPDATE' and new.organizer_id is not null then
    if new.status = 'approved' and old.status is distinct from 'approved' then
      perform public.push_notification(new.organizer_id, 'Event approved', new.title || ' was approved.', 'approval', new.id);
    elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
      perform public.push_notification(new.organizer_id, 'Event rejected', new.title || ' was rejected: ' || coalesce(new.rejection_reason, 'see details') || '.', 'approval', new.id);
    end if;
  end if;
  return new;
end $$;

create trigger events_notify after insert or update of status on public.events
for each row execute function public.on_event_status_change();

-- ---- Registration rules (enforced by the database, not only by the UI) ----
create or replace function public.guard_registration()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_event public.events%rowtype;
  v_taken integer;
  v_uid uuid := auth.uid();
  v_becomes_registered boolean;
begin
  if tg_op = 'UPDATE' then
    if new.event_id is distinct from old.event_id or new.student_id is distinct from old.student_id then
      raise exception 'CF_FORBIDDEN: A registration cannot be moved to another event or student.';
    end if;
    -- A student may only register again or cancel; faculty and admins may also waitlist
    if v_uid is not null and v_uid = old.student_id and not public.is_admin() and not public.owns_event(old.event_id) then
      if new.status not in ('registered', 'cancelled') then
        raise exception 'CF_FORBIDDEN: Students can only register or cancel.';
      end if;
      new.registered_at := old.registered_at;
    end if;
  end if;

  -- OLD does not exist on INSERT, so it is only read inside the UPDATE branch
  if tg_op = 'INSERT' then
    v_becomes_registered := new.status = 'registered';
  else
    v_becomes_registered := new.status = 'registered' and old.status is distinct from 'registered';
  end if;

  if v_becomes_registered then
    select * into v_event from public.events where id = new.event_id for update; -- serialises concurrent sign-ups
    if not found then
      raise exception 'CF_EVENT_NOT_FOUND: This event does not exist.';
    end if;
    if v_event.status not in ('approved', 'registration_open') then
      raise exception 'CF_REGISTRATION_CLOSED: Registration is not open for this event.';
    end if;
    if v_event.event_date < current_date then
      raise exception 'CF_EVENT_ENDED: This event has already taken place.';
    end if;
    if v_event.registration_deadline is not null and v_event.registration_deadline < current_date then
      raise exception 'CF_DEADLINE_PASSED: The registration deadline has passed.';
    end if;
    if not exists (select 1 from public.profiles p where p.id = new.student_id and p.role = 'student' and p.status = 'active') then
      raise exception 'CF_NOT_STUDENT: Only active student accounts can register for events.';
    end if;
    select count(*) into v_taken from public.event_registrations r
      where r.event_id = new.event_id and r.status = 'registered' and r.id is distinct from new.id;
    if v_taken >= v_event.capacity then
      raise exception 'CF_EVENT_FULL: This event has reached its capacity.';
    end if;
  end if;
  return new;
end $$;

create trigger registrations_guard before insert or update on public.event_registrations
for each row execute function public.guard_registration();

create or replace function public.on_registration_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_becomes_registered boolean;
begin
  if tg_op = 'INSERT' then
    v_becomes_registered := new.status = 'registered';
  else
    v_becomes_registered := new.status = 'registered' and old.status is distinct from 'registered';
  end if;
  if v_becomes_registered then
    select title into v_title from public.events where id = new.event_id;
    perform public.push_notification(new.student_id, 'Registration confirmed', 'You are registered for ' || v_title || '.', 'registration', new.event_id);
  end if;
  return new;
end $$;

create trigger registrations_notify after insert or update of status on public.event_registrations
for each row execute function public.on_registration_created();

-- ---- Attendance rules, points and notifications ----
create or replace function public.guard_attendance()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_reg uuid;
  v_status text;
begin
  select status into v_status from public.events where id = new.event_id;
  if v_status is null or not public.is_published_status(v_status) then
    raise exception 'CF_EVENT_NOT_PUBLISHED: Attendance can only be marked for approved events.';
  end if;
  select r.id into v_reg from public.event_registrations r
    where r.event_id = new.event_id and r.student_id = new.student_id and r.status = 'registered';
  if v_reg is null then
    raise exception 'CF_NOT_REGISTERED: This student is not registered for the event.';
  end if;
  new.registration_id := v_reg;
  new.marked_at := now();
  if auth.uid() is not null then
    new.marked_by := auth.uid();
  end if;
  return new;
end $$;

create trigger attendance_guard before insert or update on public.attendance
for each row execute function public.guard_attendance();

-- Points rules: Participation +10, Workshop events +15, Hackathon events +30 (awarded when a student is marked present)
create or replace function public.on_attendance_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_category text;
  v_title text;
  v_reason text;
  v_points integer;
  v_changed boolean;
begin
  select c.name, e.title into v_category, v_title
  from public.events e join public.event_categories c on c.id = e.category_id
  where e.id = new.event_id;

  v_reason := case v_category when 'Workshop' then 'Workshop' when 'Hackathon' then 'Hackathon' else 'Participation' end;
  v_points := case v_reason when 'Workshop' then 15 when 'Hackathon' then 30 else 10 end;

  if new.status = 'present' then
    insert into public.participation_points (student_id, event_id, points, reason)
    values (new.student_id, new.event_id, v_points, v_reason)
    on conflict (student_id, event_id, reason) do nothing;
  else
    delete from public.participation_points
    where student_id = new.student_id and event_id = new.event_id and reason in ('Participation', 'Workshop', 'Hackathon');
  end if;

  if tg_op = 'INSERT' then
    v_changed := true;
  else
    v_changed := old.status is distinct from new.status;
  end if;
  if v_changed then
    perform public.push_notification(new.student_id, 'Attendance updated',
      'You were marked ' || new.status || ' for ' || coalesce(v_title, 'an event') || '.', 'attendance', new.event_id);
  end if;
  return new;
end $$;

create trigger attendance_after after insert or update of status on public.attendance
for each row execute function public.on_attendance_change();

create or replace function public.on_attendance_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.participation_points
  where student_id = old.student_id and event_id = old.event_id and reason in ('Participation', 'Workshop', 'Hackathon');
  return old;
end $$;

create trigger attendance_deleted after delete on public.attendance
for each row execute function public.on_attendance_delete();

-- ---- Certificates: only for students who were present; number and verification code are generated here ----
create or replace function public.guard_certificate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.attendance a
                   where a.event_id = new.event_id and a.student_id = new.student_id and a.status = 'present') then
      raise exception 'CF_NOT_ATTENDED: A certificate can only be issued to a student who was marked present.';
    end if;
    new.certificate_number := 'CF-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.certificate_number_seq')::text, 5, '0');
    new.verification_code := upper(substr(md5(random()::text || clock_timestamp()::text || new.student_id::text), 1, 10));
    new.certificate_url := null;
    new.verified_at := null;
    new.verified_by := null;
    new.issued_at := now();
  else
    new.event_id := old.event_id;
    new.student_id := old.student_id;
    new.certificate_number := old.certificate_number;
    new.verification_code := old.verification_code;
    new.certificate_type := old.certificate_type;
    if new.verified_at is distinct from old.verified_at and new.verified_at is not null then
      new.verified_by := auth.uid();
    end if;
  end if;
  return new;
end $$;

create trigger certificates_guard before insert or update on public.certificates
for each row execute function public.guard_certificate();

create or replace function public.on_certificate_issued()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_reason text;
  v_points integer;
begin
  select title into v_title from public.events where id = new.event_id;
  v_reason := case new.certificate_type when 'winner' then 'Winner' when 'runner_up' then 'Runner-up' when 'volunteer' then 'Volunteer' else null end;
  v_points := case new.certificate_type when 'winner' then 50 when 'runner_up' then 30 when 'volunteer' then 25 else 0 end;
  if v_reason is not null then
    insert into public.participation_points (student_id, event_id, points, reason)
    values (new.student_id, new.event_id, v_points, v_reason)
    on conflict (student_id, event_id, reason) do nothing;
  end if;
  perform public.push_notification(new.student_id, 'Certificate available',
    'Your ' || replace(new.certificate_type, '_', ' ') || ' certificate for ' || coalesce(v_title, 'an event') || ' is ready.', 'certificate', new.event_id);
  return new;
end $$;

create trigger certificates_after after insert on public.certificates
for each row execute function public.on_certificate_issued();

-- ---- Announcements: author, publish time and notifications for the audience ----
create or replace function public.guard_announcement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.created_by := old.created_by;
  end if;
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;

create trigger announcements_guard before insert or update on public.announcements
for each row execute function public.guard_announcement();

create or replace function public.on_announcement_published()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_became_published boolean;
begin
  if tg_op = 'INSERT' then
    v_became_published := new.status = 'published';
  else
    v_became_published := new.status = 'published' and old.status is distinct from 'published';
  end if;
  if v_became_published then
    insert into public.notifications (user_id, title, message, type, related_event_id)
    select p.id, new.title, new.message, 'announcement', new.event_id
    from public.profiles p
    where p.role = 'student' and p.status = 'active' and (
      new.audience = 'all_students'
      or (new.audience = 'registered_participants' and exists (
            select 1 from public.event_registrations r
            where r.event_id = new.event_id and r.student_id = p.id and r.status = 'registered'))
      or (new.audience = 'event_participants' and exists (
            select 1 from public.attendance a
            where a.event_id = new.event_id and a.student_id = p.id and a.status = 'present'))
      or (new.audience = 'department' and p.department_id is not null and p.department_id = (
            select e.department_id from public.events e where e.id = new.event_id))
    );
  end if;
  return new;
end $$;

create trigger announcements_notify after insert or update of status on public.announcements
for each row execute function public.on_announcement_published();

-- ---- Feedback: only after attending, only once per event ----
create or replace function public.guard_feedback()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_date date;
begin
  select event_date into v_date from public.events where id = new.event_id;
  if v_date is null then
    raise exception 'CF_EVENT_NOT_FOUND: This event does not exist.';
  end if;
  if v_date > current_date then
    raise exception 'CF_FEEDBACK_NOT_ALLOWED: Feedback opens once the event has taken place.';
  end if;
  if not exists (select 1 from public.attendance a
                 where a.event_id = new.event_id and a.student_id = new.student_id and a.status = 'present') then
    raise exception 'CF_FEEDBACK_NOT_ALLOWED: Feedback is only available to students who attended the event.';
  end if;
  return new;
end $$;

create trigger feedback_guard before insert on public.feedback
for each row execute function public.guard_feedback();

-- ============================================================================
-- 9. Row Level Security
-- Every table has RLS switched on. Policies use the database role helpers above.
-- ============================================================================
alter table public.departments          enable row level security;
alter table public.event_categories     enable row level security;
alter table public.venues               enable row level security;
alter table public.clubs                enable row level security;
alter table public.profiles             enable row level security;
alter table public.events               enable row level security;
alter table public.event_registrations  enable row level security;
alter table public.attendance           enable row level security;
alter table public.certificates         enable row level security;
alter table public.announcements        enable row level security;
alter table public.feedback             enable row level security;
alter table public.participation_points enable row level security;
alter table public.notifications        enable row level security;
alter table public.event_gallery        enable row level security;

-- Table privileges: start from nothing, then give only what the policies need.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

grant select on public.departments, public.event_categories, public.venues, public.clubs,
                public.events, public.event_gallery, public.event_seat_counts to anon;
grant select on public.event_seat_counts to authenticated;
grant select, insert, update, delete on
  public.departments, public.event_categories, public.venues, public.clubs, public.profiles, public.events,
  public.event_registrations, public.attendance, public.certificates, public.announcements,
  public.event_gallery to authenticated;
grant select, insert on public.feedback to authenticated;
grant select on public.participation_points to authenticated;
grant select, delete on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated; -- a user can only mark their own notifications read
grant delete on public.feedback to authenticated;                 -- admin-only through the policy below

-- ---- Reference data: everyone reads, only admins change ----
create policy departments_read   on public.departments      for select to anon, authenticated using (true);
create policy categories_read    on public.event_categories for select to anon, authenticated using (true);
create policy venues_read        on public.venues           for select to anon, authenticated using (true);
create policy clubs_read         on public.clubs            for select to anon, authenticated using (true);

create policy departments_admin  on public.departments      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy categories_admin   on public.event_categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy venues_admin       on public.venues           for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy clubs_admin        on public.clubs            for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- Profiles ----
create policy profiles_read_own on public.profiles for select to authenticated
  using (id = auth.uid());
create policy profiles_read_admin on public.profiles for select to authenticated
  using (public.is_admin());
-- Faculty can see the students who registered for their events
create policy profiles_read_faculty_students on public.profiles for select to authenticated
  using (public.is_faculty() and exists (
    select 1 from public.event_registrations r
    join public.events e on e.id = r.event_id
    where r.student_id = profiles.id and e.organizer_id = auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- Events ----
create policy events_read_published on public.events for select to anon, authenticated
  using (public.is_published_status(status));
create policy events_read_own on public.events for select to authenticated
  using (organizer_id = auth.uid());
create policy events_read_admin on public.events for select to authenticated
  using (public.is_admin());
create policy events_insert on public.events for insert to authenticated
  with check (public.is_admin() or (public.is_faculty() and organizer_id = auth.uid()));
create policy events_update on public.events for update to authenticated
  using (public.is_admin() or (public.is_faculty() and organizer_id = auth.uid()))
  with check (public.is_admin() or (public.is_faculty() and organizer_id = auth.uid()));
create policy events_delete on public.events for delete to authenticated
  using (public.is_admin() or (public.is_faculty() and organizer_id = auth.uid() and status = 'draft'));

-- ---- Registrations ----
create policy registrations_read on public.event_registrations for select to authenticated
  using (student_id = auth.uid() or public.owns_event(event_id) or public.is_admin());
create policy registrations_insert on public.event_registrations for insert to authenticated
  with check (student_id = auth.uid() and public.is_student());
create policy registrations_update on public.event_registrations for update to authenticated
  using (student_id = auth.uid() or public.owns_event(event_id) or public.is_admin())
  with check (student_id = auth.uid() or public.owns_event(event_id) or public.is_admin());
create policy registrations_delete on public.event_registrations for delete to authenticated
  using (public.is_admin());

-- ---- Attendance ----
create policy attendance_read on public.attendance for select to authenticated
  using (student_id = auth.uid() or public.owns_event(event_id) or public.is_admin());
create policy attendance_write on public.attendance for all to authenticated
  using (public.owns_event(event_id) or public.is_admin())
  with check (public.owns_event(event_id) or public.is_admin());

-- ---- Certificates ----
create policy certificates_read on public.certificates for select to authenticated
  using ((student_id = auth.uid() and status = 'issued') or public.owns_event(event_id) or public.is_admin());
create policy certificates_insert on public.certificates for insert to authenticated
  with check (public.owns_event(event_id) or public.is_admin());
create policy certificates_update on public.certificates for update to authenticated
  using (public.owns_event(event_id) or public.is_admin())
  with check (public.owns_event(event_id) or public.is_admin());
create policy certificates_delete on public.certificates for delete to authenticated
  using (public.is_admin());

-- ---- Announcements ----
create policy announcements_read_author on public.announcements for select to authenticated
  using (created_by = auth.uid() or public.is_admin() or (event_id is not null and public.owns_event(event_id)));
create policy announcements_read_student on public.announcements for select to authenticated
  using (
    status = 'published' and public.is_student() and (
      audience = 'all_students'
      or (audience = 'registered_participants' and exists (
            select 1 from public.event_registrations r
            where r.event_id = announcements.event_id and r.student_id = auth.uid() and r.status = 'registered'))
      or (audience = 'event_participants' and exists (
            select 1 from public.attendance a
            where a.event_id = announcements.event_id and a.student_id = auth.uid() and a.status = 'present'))
      or (audience = 'department' and exists (
            select 1 from public.events e join public.profiles me on me.id = auth.uid()
            where e.id = announcements.event_id and me.department_id is not null and e.department_id = me.department_id))
    ));
create policy announcements_insert on public.announcements for insert to authenticated
  with check (public.is_admin() or (public.is_faculty() and event_id is not null and public.owns_event(event_id)));
create policy announcements_update on public.announcements for update to authenticated
  using (public.is_admin() or created_by = auth.uid())
  with check (public.is_admin() or (created_by = auth.uid() and event_id is not null and public.owns_event(event_id)));
create policy announcements_delete on public.announcements for delete to authenticated
  using (public.is_admin() or created_by = auth.uid());

-- ---- Feedback (students insert once; nobody edits) ----
create policy feedback_read on public.feedback for select to authenticated
  using (student_id = auth.uid() or public.owns_event(event_id) or public.is_admin());
create policy feedback_insert on public.feedback for insert to authenticated
  with check (student_id = auth.uid() and public.is_student());
create policy feedback_delete on public.feedback for delete to authenticated
  using (public.is_admin());

-- ---- Participation points (written only by triggers) ----
create policy points_read on public.participation_points for select to authenticated
  using (student_id = auth.uid() or public.is_admin());

-- ---- Notifications ----
create policy notifications_read on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- ---- Event gallery ----
create policy gallery_read on public.event_gallery for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_gallery.event_id and public.is_published_status(e.status)));
create policy gallery_insert on public.event_gallery for insert to authenticated
  with check (public.is_admin() or public.owns_event(event_id));
create policy gallery_update on public.event_gallery for update to authenticated
  using (public.is_admin() or public.owns_event(event_id))
  with check (public.is_admin() or public.owns_event(event_id));
create policy gallery_delete on public.event_gallery for delete to authenticated
  using (public.is_admin() or public.owns_event(event_id));

-- ============================================================================
-- 10. Storage buckets and policies
-- Files live in a folder named after the user id: <bucket>/<user id>/<file>
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('event-posters',  'event-posters',  true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('profile-images', 'profile-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('event-gallery',  'event-gallery',  true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy storage_public_read on storage.objects for select to anon, authenticated
  using (bucket_id in ('event-posters', 'profile-images', 'event-gallery'));

create policy storage_posters_write on storage.objects for insert to authenticated
  with check (bucket_id in ('event-posters', 'event-gallery')
              and (public.is_faculty() or public.is_admin())
              and (storage.foldername(name))[1] = auth.uid()::text);
create policy storage_profile_write on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy storage_owner_update on storage.objects for update to authenticated
  using (bucket_id in ('event-posters', 'profile-images', 'event-gallery')
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()))
  with check (bucket_id in ('event-posters', 'profile-images', 'event-gallery')
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy storage_owner_delete on storage.objects for delete to authenticated
  using (bucket_id in ('event-posters', 'profile-images', 'event-gallery')
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
