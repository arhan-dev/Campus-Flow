-- ============================================================================
-- CampusFlow - Section 7 migration (Supabase / PostgreSQL)
-- Run ONCE, in the SQL Editor, AFTER 001_initial_schema.sql (and seed.sql).
-- It adds: automatic event lifecycle, event cancellation, QR attendance sessions,
-- public certificate verification, event gallery rules, safer role management,
-- and realtime publication for notifications / attendance / registrations.
--
-- It does not weaken any Section 6 policy. Existing guard functions are replaced
-- (create or replace) with versions that keep every Section 6 rule and add the new ones.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Settings and the campus clock
-- Event dates and times have no time zone, so "now" must be read in ONE campus time zone.
-- Change it with:  update public.app_settings set value = 'Europe/London' where key = 'campus_timezone';
-- ----------------------------------------------------------------------------
create table public.app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values ('campus_timezone', 'Asia/Kolkata')
on conflict (key) do nothing;

create or replace function public.validate_app_setting()
returns trigger language plpgsql as $$
begin
  if new.key = 'campus_timezone' and not exists (select 1 from pg_timezone_names z where z.name = new.value) then
    raise exception 'CF_BAD_SETTING: "%" is not a known time zone name.', new.value;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger app_settings_validate before insert or update on public.app_settings
for each row execute function public.validate_app_setting();

-- Current wall-clock time and date on campus
create or replace function public.campus_now()
returns timestamp language sql stable security definer set search_path = public as $$
  select now() at time zone coalesce((select s.value from public.app_settings s where s.key = 'campus_timezone'), 'UTC')
$$;

create or replace function public.campus_today()
returns date language sql stable security definer set search_path = public as $$
  select public.campus_now()::date
$$;

-- ----------------------------------------------------------------------------
-- 2. Events: registration start date, cancellation, new status
-- ----------------------------------------------------------------------------
alter table public.events
  add column registration_opens_on date,
  add column cancellation_reason   text,
  add column cancelled_at          timestamptz,
  add column cancelled_by          uuid references public.profiles (id) on delete set null;

alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check check (status in (
  'draft', 'pending_approval', 'approved', 'registration_open',
  'registration_closed', 'ongoing', 'completed', 'rejected', 'cancelled'));

alter table public.events add constraint events_opens_order check (
  registration_opens_on is null
  or (registration_opens_on <= event_date
      and (registration_deadline is null or registration_opens_on <= registration_deadline)));

-- Cancelled events stay public (registered students must still see them; history is kept)
create or replace function public.is_published_status(p_status text)
returns boolean language sql immutable as $$
  select p_status in ('approved', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled')
$$;

-- ----------------------------------------------------------------------------
-- 3. Automatic event lifecycle
-- The database decides what an event's stage is RIGHT NOW from its dates (compute_event_status).
-- Registration is checked against that value, never against a stored status that may be stale.
-- sync_event_lifecycle() writes the computed stage back to events.status (scheduled with pg_cron
-- when available, and also callable by the app).
--
--   before registration opens ........ approved
--   registration open ................ registration_open
--   after the registration deadline .. registration_closed
--   from the event start time ........ ongoing
--   after the event end time ......... completed   (no end time: the end of the event day)
-- ----------------------------------------------------------------------------
create or replace function public.compute_event_status(e public.events)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  v_now   timestamp := public.campus_now();
  v_start timestamp;
  v_end   timestamp;
begin
  if e.status not in ('approved', 'registration_open', 'registration_closed', 'ongoing', 'completed') then
    return e.status; -- draft, pending_approval, rejected, cancelled never move on their own
  end if;
  v_start := e.event_date + e.start_time;
  v_end := case when e.end_time is not null then e.event_date + e.end_time else (e.event_date + 1)::timestamp end;

  if v_now >= v_end then return 'completed'; end if;
  if v_now >= v_start then return 'ongoing'; end if;
  if e.registration_deadline is not null and v_now::date > e.registration_deadline then return 'registration_closed'; end if;
  if e.registration_opens_on is not null and v_now::date < e.registration_opens_on then return 'approved'; end if;
  return 'registration_open';
end $$;

-- What every event is right now. security_invoker: each reader only sees events their own RLS allows.
create or replace view public.event_live_status with (security_invoker = true) as
select e.id as event_id, public.compute_event_status(e) as live_status
from public.events e;

create or replace function public.sync_event_lifecycle()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  perform set_config('campusflow.lifecycle_sync', 'on', true); -- transaction-local; read by guard_event_write
  with changed as (
    update public.events e
       set status = public.compute_event_status(e)
     where e.status in ('approved', 'registration_open', 'registration_closed', 'ongoing', 'completed')
       and e.status is distinct from public.compute_event_status(e)
    returning 1
  )
  select count(*) into v_count from changed;
  perform set_config('campusflow.lifecycle_sync', 'off', true);
  return v_count;
end $$;

-- ----------------------------------------------------------------------------
-- 4. Event write rules (replaces the Section 6 function; all Section 6 rules are kept)
--    + time-driven lifecycle updates + cancellation (owner or admin, reason required)
-- ----------------------------------------------------------------------------
create or replace function public.guard_event_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_admin  boolean;
  v_reason text;
begin
  -- Automatic lifecycle: only sync_event_lifecycle() sets this flag, and only the computed stage is accepted.
  if tg_op = 'UPDATE' and current_setting('campusflow.lifecycle_sync', true) = 'on' then
    if new.status is distinct from old.status
       and old.status in ('approved', 'registration_open', 'registration_closed', 'ongoing', 'completed')
       and new.status = public.compute_event_status(new) then
      return new;
    end if;
    raise exception 'CF_FORBIDDEN_STATUS: Only the automatic lifecycle can run here.';
  end if;

  if auth.uid() is null then
    return new; -- SQL editor / maintenance context (for example the seed file)
  end if;
  v_admin := public.is_admin();

  if tg_op = 'INSERT' then
    if new.status = 'cancelled' then
      raise exception 'CF_FORBIDDEN_STATUS: An event cannot be created as cancelled.';
    end if;
    new.cancellation_reason := null;
    new.cancelled_at := null;
    new.cancelled_by := null;
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
  v_reason := nullif(trim(coalesce(new.cancellation_reason, '')), '');

  if old.status = 'cancelled' and new.status is distinct from 'cancelled' then
    raise exception 'CF_FORBIDDEN_STATUS: A cancelled event cannot be reopened. Create a new event instead.';
  end if;

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
      if new.status = 'cancelled' then
        if old.status not in ('approved', 'registration_open', 'registration_closed', 'ongoing') then
          raise exception 'CF_FORBIDDEN_STATUS: Only an approved event can be cancelled.';
        end if;
      elsif not (new.status in ('draft', 'pending_approval') and old.status in ('draft', 'pending_approval', 'rejected')) then
        raise exception 'CF_FORBIDDEN_STATUS: Only an admin can change the status of this event.';
      end if;
    end if;
  elsif new.status is distinct from old.status
        and new.status in ('approved', 'rejected')
        and old.status <> 'pending_approval' then
    raise exception 'CF_FORBIDDEN_STATUS: Only events that are pending approval can be approved or rejected.';
  end if;

  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    if old.status not in ('approved', 'registration_open', 'registration_closed', 'ongoing') then
      raise exception 'CF_FORBIDDEN_STATUS: Only an approved event can be cancelled.';
    end if;
    if public.compute_event_status(old) = 'completed' then
      raise exception 'CF_EVENT_ENDED: This event has already taken place and cannot be cancelled.';
    end if;
    if v_reason is null then
      raise exception 'CF_REASON_REQUIRED: A cancellation reason is required.';
    end if;
    new.cancellation_reason := v_reason;
    new.cancelled_at := now();
    new.cancelled_by := auth.uid();
  else
    new.cancellation_reason := old.cancellation_reason;
    new.cancelled_at := old.cancelled_at;
    new.cancelled_by := old.cancelled_by;
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

-- Notifications for status changes (approval workflow + cancellation)
create or replace function public.on_event_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_became_pending boolean;
  v_canceller_role text;
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

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    -- approval decision: only from pending_approval (automatic lifecycle changes must not look like approvals)
    if new.organizer_id is not null and old.status = 'pending_approval' then
      if new.status = 'approved' then
        perform public.push_notification(new.organizer_id, 'Event approved', new.title || ' was approved.', 'approval', new.id);
      elsif new.status = 'rejected' then
        perform public.push_notification(new.organizer_id, 'Event rejected', new.title || ' was rejected: ' || coalesce(new.rejection_reason, 'see details') || '.', 'approval', new.id);
      end if;
    end if;

    if new.status = 'cancelled' then
      -- everyone who holds a registration (history stays in the table)
      insert into public.notifications (user_id, title, message, type, related_event_id)
      select r.student_id, 'Event cancelled',
             new.title || ' was cancelled. Reason: ' || coalesce(new.cancellation_reason, 'not given') || '.', 'cancellation', new.id
      from public.event_registrations r
      where r.event_id = new.id and r.status = 'registered';
      select p.role into v_canceller_role from public.profiles p where p.id = new.cancelled_by;
      if new.organizer_id is not null and new.organizer_id is distinct from new.cancelled_by then
        perform public.push_notification(new.organizer_id, 'Event cancelled', new.title || ' was cancelled by an administrator: ' || coalesce(new.cancellation_reason, 'no reason given') || '.', 'cancellation', new.id);
      end if;
      if v_canceller_role is distinct from 'admin' then
        insert into public.notifications (user_id, title, message, type, related_event_id)
        select p.id, 'Event cancelled', new.title || ' was cancelled by its organizer.', 'cancellation', new.id
        from public.profiles p where p.role = 'admin' and p.status = 'active';
      end if;
    end if;
  end if;
  return new;
end $$;

-- ----------------------------------------------------------------------------
-- 5. Registration rules (replaces the Section 6 function)
-- The decision uses the LIVE status computed from the dates, so a stale events.status can never
-- allow a registration that should be refused. Section 6 rules (capacity, duplicates, active student,
-- students can only register or cancel) are kept.
-- ----------------------------------------------------------------------------
create or replace function public.guard_registration()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_event public.events%rowtype;
  v_live text;
  v_taken integer;
  v_uid uuid := auth.uid();
  v_becomes_registered boolean;
  v_student_actor boolean := false;
begin
  if tg_op = 'UPDATE' then
    if new.event_id is distinct from old.event_id or new.student_id is distinct from old.student_id then
      raise exception 'CF_FORBIDDEN: A registration cannot be moved to another event or student.';
    end if;
    -- A student may only register again or cancel; faculty and admins may also waitlist
    if v_uid is not null and v_uid = old.student_id and not public.is_admin() and not public.owns_event(old.event_id) then
      v_student_actor := true;
      if new.status not in ('registered', 'cancelled') then
        raise exception 'CF_FORBIDDEN: Students can only register or cancel.';
      end if;
      new.registered_at := old.registered_at;
    end if;
  end if;

  -- A student cannot cancel once the event has started or after being marked present (history is kept)
  if tg_op = 'UPDATE' and v_student_actor and new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    select * into v_event from public.events where id = old.event_id;
    if found and v_event.status <> 'cancelled' and public.compute_event_status(v_event) in ('ongoing', 'completed') then
      raise exception 'CF_CANCEL_NOT_ALLOWED: A registration cannot be cancelled once the event has started.';
    end if;
    if exists (select 1 from public.attendance a where a.event_id = old.event_id and a.student_id = old.student_id and a.status = 'present') then
      raise exception 'CF_CANCEL_NOT_ALLOWED: You were marked present, so this registration can no longer be cancelled.';
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
    if v_event.status = 'cancelled' then
      raise exception 'CF_EVENT_CANCELLED: This event was cancelled.';
    end if;
    if v_event.status not in ('approved', 'registration_open', 'registration_closed', 'ongoing', 'completed') then
      raise exception 'CF_REGISTRATION_CLOSED: Registration is not open for this event.';
    end if;
    v_live := public.compute_event_status(v_event);
    if v_live = 'completed' then
      raise exception 'CF_EVENT_ENDED: This event has already taken place.';
    elsif v_live = 'ongoing' then
      raise exception 'CF_REGISTRATION_CLOSED: Registration closed when the event started.';
    elsif v_live = 'registration_closed' then
      raise exception 'CF_DEADLINE_PASSED: The registration deadline has passed.';
    elsif v_live = 'approved' then
      raise exception 'CF_REGISTRATION_NOT_OPEN: Registration has not opened yet for this event.';
    elsif v_live <> 'registration_open' then
      raise exception 'CF_REGISTRATION_CLOSED: Registration is not open for this event.';
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

-- Registration confirmation (Section 6) + confirmation of a cancellation made by the student
create or replace function public.on_registration_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_becomes_registered boolean;
  v_becomes_cancelled boolean;
begin
  if tg_op = 'INSERT' then
    v_becomes_registered := new.status = 'registered';
    v_becomes_cancelled := false;
  else
    v_becomes_registered := new.status = 'registered' and old.status is distinct from 'registered';
    v_becomes_cancelled := new.status = 'cancelled' and old.status is distinct from 'cancelled';
  end if;
  if v_becomes_registered then
    select title into v_title from public.events where id = new.event_id;
    perform public.push_notification(new.student_id, 'Registration confirmed', 'You are registered for ' || v_title || '.', 'registration', new.event_id);
  elsif v_becomes_cancelled and auth.uid() is not distinct from new.student_id then
    select title into v_title from public.events where id = new.event_id;
    perform public.push_notification(new.student_id, 'Registration cancelled', 'Your registration for ' || v_title || ' was cancelled.', 'registration', new.event_id);
  end if;
  return new;
end $$;

-- ----------------------------------------------------------------------------
-- 6. Attendance: how it was marked + QR sessions
-- ----------------------------------------------------------------------------
alter table public.attendance
  add column method text not null default 'manual' check (method in ('manual', 'qr'));

create or replace function public.guard_attendance()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_reg uuid;
  v_status text;
begin
  select status into v_status from public.events where id = new.event_id;
  if v_status = 'cancelled' then
    raise exception 'CF_EVENT_CANCELLED: This event was cancelled, so attendance cannot be marked.';
  end if;
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
  -- 'qr' can only be written by check_in_with_code(), which sets this transaction-local flag
  new.method := case when current_setting('campusflow.qr_checkin', true) = 'on' then 'qr' else 'manual' end;
  return new;
end $$;

create table public.attendance_sessions (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  code       text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  closed_at  timestamptz,
  constraint attendance_sessions_window check (expires_at > created_at)
);
create index attendance_sessions_event_idx on public.attendance_sessions (event_id, created_at desc);
-- at most one open session per event
create unique index attendance_sessions_one_open on public.attendance_sessions (event_id) where closed_at is null;

alter table public.attendance_sessions enable row level security;
revoke all on public.attendance_sessions from anon, authenticated;
grant select on public.attendance_sessions to authenticated;
-- Only the organizer and admins can read a session (the code is the secret). There are no insert/update/delete
-- policies: sessions are created and closed only by the functions below.
create policy attendance_sessions_read on public.attendance_sessions for select to authenticated
  using (public.owns_event(event_id) or public.is_admin());

-- Faculty (own event) or admin: open a check-in session. Replaces any open session of that event.
create or replace function public.open_attendance_session(p_event_id uuid, p_minutes integer default 120)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_event public.events%rowtype;
  v_live text;
  v_code text;
  v_id uuid;
  v_expires timestamptz;
begin
  if auth.uid() is null or not (public.is_admin() or public.owns_event(p_event_id)) then
    raise exception 'CF_FORBIDDEN: You cannot manage attendance for this event.';
  end if;
  if p_minutes is null or p_minutes < 5 or p_minutes > 480 then
    raise exception 'CF_BAD_DURATION: Choose a duration between 5 and 480 minutes.';
  end if;
  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'CF_EVENT_NOT_FOUND: This event does not exist.';
  end if;
  if v_event.status = 'cancelled' then
    raise exception 'CF_EVENT_CANCELLED: This event was cancelled.';
  end if;
  if not public.is_published_status(v_event.status) then
    raise exception 'CF_EVENT_NOT_PUBLISHED: Attendance can only be marked for approved events.';
  end if;
  v_live := public.compute_event_status(v_event);
  if v_event.event_date <> public.campus_today() or v_live not in ('registration_open', 'registration_closed', 'ongoing') then
    raise exception 'CF_ATTENDANCE_NOT_OPEN: QR attendance can only be opened on the day of the event, before it ends. Use manual attendance otherwise.';
  end if;

  update public.attendance_sessions set closed_at = now() where event_id = p_event_id and closed_at is null;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)); -- 48 random bits, hex
  v_expires := now() + make_interval(mins => p_minutes);
  insert into public.attendance_sessions (event_id, code, created_by, expires_at)
  values (p_event_id, v_code, auth.uid(), v_expires)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'code', v_code, 'expires_at', v_expires);
end $$;

create or replace function public.close_attendance_session(p_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not (public.is_admin() or public.owns_event(p_event_id)) then
    raise exception 'CF_FORBIDDEN: You cannot manage attendance for this event.';
  end if;
  update public.attendance_sessions set closed_at = now() where event_id = p_event_id and closed_at is null;
end $$;

-- Student: check in with the code from the QR. The code is only a key; everything is verified here.
create or replace function public.check_in_with_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_session public.attendance_sessions%rowtype;
  v_event public.events%rowtype;
  v_existing text;
begin
  if v_uid is null then
    raise exception 'CF_NOT_AUTHENTICATED: Please log in to check in.';
  end if;
  if not public.is_student() then
    raise exception 'CF_NOT_STUDENT: Only active student accounts can check in to an event.';
  end if;

  -- Typed codes: ignore spacing/dashes/case; the code is hex, so O, I and L can only be typos for 0, 1, 1
  v_code := translate(upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g')), 'OIL', '011');
  if length(v_code) <> 12 then
    raise exception 'CF_INVALID_CODE: That attendance code is not valid.';
  end if;

  select * into v_session from public.attendance_sessions where code = v_code;
  if not found then
    raise exception 'CF_INVALID_CODE: That attendance code is not valid.';
  end if;
  if v_session.closed_at is not null then
    raise exception 'CF_SESSION_CLOSED: Check-in for this event has been closed by the organizer.';
  end if;
  if v_session.expires_at <= now() then
    raise exception 'CF_SESSION_EXPIRED: This attendance code has expired. Ask the organizer for a new one.';
  end if;

  select * into v_event from public.events where id = v_session.event_id;
  if v_event.status = 'cancelled' then
    raise exception 'CF_EVENT_CANCELLED: This event was cancelled.';
  end if;
  if not public.is_published_status(v_event.status) then
    raise exception 'CF_EVENT_NOT_PUBLISHED: Attendance can only be marked for approved events.';
  end if;
  if public.compute_event_status(v_event) = 'completed' or v_event.event_date <> public.campus_today() then
    raise exception 'CF_ATTENDANCE_NOT_OPEN: Check-in is only possible on the day of the event, before it ends.';
  end if;

  if not exists (select 1 from public.event_registrations r
                 where r.event_id = v_event.id and r.student_id = v_uid and r.status = 'registered') then
    raise exception 'CF_NOT_REGISTERED: You are not registered for this event.';
  end if;

  select a.status into v_existing from public.attendance a where a.event_id = v_event.id and a.student_id = v_uid;
  if v_existing = 'present' then
    raise exception 'CF_ALREADY_MARKED: You are already marked present for this event.';
  end if;

  perform set_config('campusflow.qr_checkin', 'on', true);
  insert into public.attendance (event_id, student_id, status)
  values (v_event.id, v_uid, 'present')
  on conflict (event_id, student_id) do update set status = 'present';
  perform set_config('campusflow.qr_checkin', 'off', true);

  return jsonb_build_object('event_id', v_event.id, 'event_title', v_event.title, 'status', 'present');
end $$;

-- ----------------------------------------------------------------------------
-- 7. Public certificate verification
-- Anyone (no login) can ask "is this certificate real?". Only public facts are returned, never ids,
-- student numbers, emails or database fields. A lookup by certificate NUMBER (guessable, sequential)
-- returns a masked recipient name; a lookup by the secret VERIFICATION CODE returns the full name.
-- ----------------------------------------------------------------------------
create or replace function public.mask_name(p_name text)
returns text language sql immutable as $$
  select coalesce(string_agg(left(w, 1) || repeat('*', greatest(char_length(w) - 1, 0)), ' '), '')
  from unnest(string_to_array(trim(coalesce(p_name, '')), ' ')) as w
  where w <> ''
$$;

create or replace function public.verify_certificate(p_query text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_q text := upper(trim(coalesce(p_query, '')));
  v_cert public.certificates%rowtype;
  v_by_code boolean;
  v_name text;
  v_title text;
  v_date date;
begin
  if char_length(v_q) < 4 or char_length(v_q) > 40 then
    return jsonb_build_object('found', false);
  end if;

  select * into v_cert from public.certificates c where c.verification_code = v_q;
  if found then
    v_by_code := true;
  else
    select * into v_cert from public.certificates c where upper(c.certificate_number) = v_q;
    if not found then
      return jsonb_build_object('found', false);
    end if;
    v_by_code := false;
  end if;

  select p.full_name into v_name from public.profiles p where p.id = v_cert.student_id;
  select e.title, e.event_date into v_title, v_date from public.events e where e.id = v_cert.event_id;

  return jsonb_build_object(
    'found', true,
    'valid', v_cert.status = 'issued',
    'status', v_cert.status,
    'certificate_number', v_cert.certificate_number,
    'certificate_type', v_cert.certificate_type,
    'issued_at', v_cert.issued_at,
    'recipient', case when v_by_code then coalesce(v_name, '') else public.mask_name(v_name) end,
    'recipient_masked', not v_by_code,
    'event_title', v_title,
    'event_date', v_date
  );
end $$;

-- ----------------------------------------------------------------------------
-- 8. Event gallery
-- Rows are created only for approved (published) events, by the event owner or an admin. The uploader and the
-- storage path (which must sit in the uploader's own folder, as the storage policy already requires) are recorded.
-- ----------------------------------------------------------------------------
alter table public.event_gallery
  add column storage_path text,
  add constraint event_gallery_caption_len check (caption is null or char_length(caption) <= 200);

create or replace function public.guard_gallery()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_count integer;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.uploaded_by := auth.uid();
      if new.storage_path is null or split_part(new.storage_path, '/', 1) <> auth.uid()::text then
        raise exception 'CF_GALLERY_INVALID: The photo must be uploaded to your own storage folder.';
      end if;
    end if;
    select status into v_status from public.events where id = new.event_id;
    if v_status is null or not public.is_published_status(v_status) then
      raise exception 'CF_GALLERY_NOT_ALLOWED: Photos can be added once the event is approved.';
    end if;
    select count(*) into v_count from public.event_gallery where event_id = new.event_id;
    if v_count >= 60 then
      raise exception 'CF_GALLERY_FULL: An event gallery can hold at most 60 photos.';
    end if;
  else
    new.event_id := old.event_id;
    new.image_url := old.image_url;
    new.storage_path := old.storage_path;
    new.uploaded_by := old.uploaded_by;
  end if;
  new.caption := nullif(trim(coalesce(new.caption, '')), '');
  return new;
end $$;

create trigger gallery_guard before insert or update on public.event_gallery
for each row execute function public.guard_gallery();

-- ----------------------------------------------------------------------------
-- 9. Role and status management by admins (replaces the Section 6 function)
-- A normal user can still never change role, status or email. Admins can change OTHER people, but
-- cannot change their own role/status and cannot remove the last active admin.
-- ----------------------------------------------------------------------------
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

-- Who changed whose role or status, and when (admins can read it; nobody can edit it)
create table public.profile_changes (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  changed_by uuid references public.profiles (id) on delete set null,
  field      text not null check (field in ('role', 'status')),
  old_value  text,
  new_value  text,
  changed_at timestamptz not null default now()
);
create index profile_changes_profile_idx on public.profile_changes (profile_id, changed_at desc);

alter table public.profile_changes enable row level security;
revoke all on public.profile_changes from anon, authenticated;
grant select on public.profile_changes to authenticated;
create policy profile_changes_read on public.profile_changes for select to authenticated using (public.is_admin());

create or replace function public.log_profile_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role then
    insert into public.profile_changes (profile_id, changed_by, field, old_value, new_value)
    values (new.id, auth.uid(), 'role', old.role, new.role);
    perform public.push_notification(new.id, 'Account role updated', 'Your CampusFlow role is now ' || new.role || '.', 'account', null);
  end if;
  if new.status is distinct from old.status then
    insert into public.profile_changes (profile_id, changed_by, field, old_value, new_value)
    values (new.id, auth.uid(), 'status', old.status, new.status);
  end if;
  return new;
end $$;

create trigger profiles_audit after update of role, status on public.profiles
for each row execute function public.log_profile_change();

-- ----------------------------------------------------------------------------
-- 10. Feedback opens on the campus date (was the database server date)
-- ----------------------------------------------------------------------------
create or replace function public.guard_feedback()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_date date;
begin
  select event_date into v_date from public.events where id = new.event_id;
  if v_date is null then
    raise exception 'CF_EVENT_NOT_FOUND: This event does not exist.';
  end if;
  if v_date > public.campus_today() then
    raise exception 'CF_FEEDBACK_NOT_ALLOWED: Feedback opens once the event has taken place.';
  end if;
  if not exists (select 1 from public.attendance a
                 where a.event_id = new.event_id and a.student_id = new.student_id and a.status = 'present') then
    raise exception 'CF_FEEDBACK_NOT_ALLOWED: Feedback is only available to students who attended the event.';
  end if;
  return new;
end $$;

-- ----------------------------------------------------------------------------
-- 11. Row Level Security and privileges for the new objects
-- ----------------------------------------------------------------------------
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to anon, authenticated;
grant insert, update on public.app_settings to authenticated;
create policy app_settings_read  on public.app_settings for select to anon, authenticated using (true);
create policy app_settings_admin on public.app_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on public.event_live_status from anon, authenticated;
grant select on public.event_live_status to anon, authenticated;

-- Function privileges: nothing by default, then only what the app needs.
revoke all on function public.campus_now()                                  from public, anon, authenticated;
revoke all on function public.campus_today()                                from public, anon, authenticated;
revoke all on function public.compute_event_status(public.events)           from public, anon, authenticated;
revoke all on function public.sync_event_lifecycle()                        from public, anon, authenticated;
revoke all on function public.open_attendance_session(uuid, integer)        from public, anon, authenticated;
revoke all on function public.close_attendance_session(uuid)                from public, anon, authenticated;
revoke all on function public.check_in_with_code(text)                      from public, anon, authenticated;
revoke all on function public.verify_certificate(text)                      from public, anon, authenticated;
revoke all on function public.mask_name(text)                               from public, anon, authenticated;

-- Views and policies run these as the calling role, so the callers need EXECUTE on the clock/status helpers.
grant execute on function public.campus_now()                      to anon, authenticated;
grant execute on function public.campus_today()                    to anon, authenticated;
grant execute on function public.compute_event_status(public.events) to anon, authenticated;
-- Safe for anyone to call: it only applies the stage the dates already dictate (idempotent).
grant execute on function public.sync_event_lifecycle()            to anon, authenticated;
grant execute on function public.open_attendance_session(uuid, integer) to authenticated;
grant execute on function public.close_attendance_session(uuid)    to authenticated;
grant execute on function public.check_in_with_code(text)          to authenticated;
grant execute on function public.verify_certificate(text)          to anon, authenticated;
grant execute on function public.mask_name(text)                   to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 12. Realtime (only what the app listens to; Realtime still applies each table's RLS)
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['notifications', 'attendance', 'event_registrations'] loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then
        null; -- already published
      end;
    end loop;
  else
    raise notice 'Publication supabase_realtime not found: realtime updates will not work until it exists.';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 13. Schedule the lifecycle job (every minute) when pg_cron is available.
-- If this block prints a notice, enable the pg_cron extension (Database > Extensions) and run
--   select cron.schedule('campusflow-event-lifecycle', '* * * * *', 'select public.sync_event_lifecycle()');
-- Without it everything still works: registration is checked against the live status, the app shows the live
-- status, and the app calls sync_event_lifecycle() while people use it.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('campusflow-event-lifecycle', '* * * * *', 'select public.sync_event_lifecycle()');
  else
    raise notice 'pg_cron is not available: events.status is synchronised by the app instead.';
  end if;
exception when others then
  raise notice 'Could not schedule the lifecycle job (%). Enable pg_cron and schedule it manually.', sqlerrm;
end $$;

-- Bring the stored status of existing events up to date right away
select public.sync_event_lifecycle();
