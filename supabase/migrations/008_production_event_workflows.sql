-- CampusFlow production workflow hardening (migration 008)
-- Apply after migrations 001-007. Adds atomic capacity enforcement, optional waitlisting,
-- waitlist promotion on cancellation, and durable in-app notification triggers.

alter table public.events add column if not exists waitlist_enabled boolean not null default true;
create index if not exists registrations_waitlist_order_idx
  on public.event_registrations(event_id, registered_at) where status = 'waitlisted';

-- Replace registration guard with serialized capacity/deadline/branch validation.
-- Locking the event row makes the capacity check safe for concurrent registration requests.
create or replace function public.guard_registration_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_event public.events%rowtype;
  v_branch text;
  v_profile_branch text;
  v_count integer;
  v_old_registered boolean := false;
begin
  if auth.uid() is not null then
    if not public.is_student() or new.student_id <> auth.uid() then
      raise exception 'CF_FORBIDDEN: Only students can manage their own registrations.';
    end if;
  end if;

  select * into v_event from public.events where id = new.event_id for update;
  if not found then raise exception 'CF_EVENT_NOT_FOUND: Event not found.'; end if;

  select d.name into v_profile_branch
    from public.profiles p left join public.departments d on d.id = p.department_id
    where p.id = new.student_id;
  v_branch := nullif(trim(new.branch), '');
  if v_profile_branch is not null and (v_branch is null or lower(v_branch) <> lower(v_profile_branch)) then
    raise exception 'CF_BRANCH_PROFILE_MISMATCH: Choose the branch saved in your student profile.';
  end if;
  if cardinality(coalesce(v_event.allowed_branches, '{}'::text[])) > 0
     and (v_branch is null or not exists (select 1 from unnest(v_event.allowed_branches) b where lower(b) = lower(v_branch))) then
    raise exception 'CF_BRANCH_NOT_ELIGIBLE: This event is restricted to selected branches.';
  end if;
  if new.status in ('registered','waitlisted') and (length(trim(coalesce(new.full_name,''))) = 0 or length(trim(coalesce(new.roll_number,''))) = 0 or length(trim(coalesce(new.branch,''))) = 0) then
    raise exception 'CF_REGISTRATION_DETAILS_REQUIRED: Full name, roll number and branch are required.';
  end if;
  if new.status in ('registered','waitlisted') then
    if not public.is_published_status(v_event.status) or v_event.status in ('registration_closed','completed','cancelled') then
      raise exception 'CF_REGISTRATION_CLOSED: Registration is not open for this event.';
    end if;
    if v_event.registration_opens_on is not null and public.campus_today() < v_event.registration_opens_on then
      raise exception 'CF_REGISTRATION_NOT_OPEN: Registration has not opened yet.';
    end if;
    if v_event.registration_deadline is not null and public.campus_today() > v_event.registration_deadline then
      raise exception 'CF_DEADLINE_PASSED: The registration deadline has passed.';
    end if;
    if v_event.event_date < public.campus_today() then
      raise exception 'CF_EVENT_ENDED: This event has already taken place.';
    end if;
  end if;

  if new.status = 'registered' then
    if tg_op = 'UPDATE' then v_old_registered := old.status = 'registered'; end if;
    if not v_old_registered then
      select count(*) into v_count from public.event_registrations r
        where r.event_id = new.event_id and r.status = 'registered';
      if v_count >= v_event.capacity then
        if v_event.waitlist_enabled then
          new.status := 'waitlisted';
        else
          raise exception 'CF_EVENT_FULL: This event has no seats remaining.';
        end if;
      end if;
    end if;
  end if;

  new.full_name := nullif(trim(new.full_name), '');
  new.roll_number := nullif(trim(new.roll_number), '');
  new.branch := nullif(trim(new.branch), '');
  return new;
end $$;

-- Single atomic registration API. If full, a student may be added to the waitlist.
create or replace function public.register_for_event(
  p_event_id uuid, p_full_name text, p_roll_number text, p_branch text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_event public.events%rowtype; v_existing public.event_registrations%rowtype; v_result public.event_registrations%rowtype;
begin
  if auth.uid() is null then raise exception 'CF_NOT_AUTHENTICATED: Please log in.'; end if;
  if not public.is_student() then raise exception 'CF_NOT_STUDENT: Only students can register.'; end if;
  select * into v_event from public.events where id = p_event_id for update;
  if not found then raise exception 'CF_EVENT_NOT_FOUND: Event not found.'; end if;
  select * into v_existing from public.event_registrations where event_id = p_event_id and student_id = auth.uid() for update;
  if found and v_existing.status in ('registered','waitlisted') then
    raise exception 'CF_DUPLICATE_REGISTRATION: You already have a registration for this event.';
  end if;
  if found then
    update public.event_registrations set status='registered', full_name=p_full_name,
      roll_number=p_roll_number, branch=p_branch, registered_at=now(), updated_at=now()
      where id=v_existing.id returning * into v_result;
  else
    insert into public.event_registrations(event_id, student_id, full_name, roll_number, branch)
      values(p_event_id, auth.uid(), p_full_name, p_roll_number, p_branch) returning * into v_result;
  end if;
  return jsonb_build_object('registration_id',v_result.id,'status',v_result.status,'event_id',p_event_id);
end $$;
revoke all on function public.register_for_event(uuid,text,text,text) from public, anon;
grant execute on function public.register_for_event(uuid,text,text,text) to authenticated;

-- Cancel through a server function and promote the oldest waitlisted student atomically.
create or replace function public.cancel_event_registration(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_reg public.event_registrations%rowtype; v_event public.events%rowtype; v_next public.event_registrations%rowtype;
begin
  if auth.uid() is null then raise exception 'CF_NOT_AUTHENTICATED: Please log in.'; end if;
  select * into v_event from public.events where id=p_event_id for update;
  if not found then raise exception 'CF_EVENT_NOT_FOUND: Event not found.'; end if;
  select * into v_reg from public.event_registrations where event_id=p_event_id and student_id=auth.uid() and status in ('registered','waitlisted') for update;
  if not found then raise exception 'CF_NOT_REGISTERED: You do not have an active registration.'; end if;
  update public.event_registrations set status='cancelled', updated_at=now() where id=v_reg.id;
  if v_reg.status='registered' then
    select * into v_next from public.event_registrations where event_id=p_event_id and status='waitlisted' order by registered_at, id for update skip locked limit 1;
    if found then
      update public.event_registrations set status='registered', updated_at=now() where id=v_next.id;
      insert into public.notifications(user_id,title,message,type,related_event_id)
        values(v_next.student_id,'A seat is available', 'You have been moved from the waitlist into a confirmed place for '||v_event.title||'.','registration',p_event_id);
    end if;
  end if;
  return jsonb_build_object('ok',true,'cancelled_status',v_reg.status);
end $$;
revoke all on function public.cancel_event_registration(uuid) from public, anon;
grant execute on function public.cancel_event_registration(uuid) to authenticated;

-- Durable notifications for registration state changes and event details changing.
create or replace function public.notify_registration_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  select title into v_title from public.events where id=new.event_id;
  if tg_op='INSERT' then
    insert into public.notifications(user_id,title,message,type,related_event_id)
    values(new.student_id,
      case when new.status='waitlisted' then 'Added to waitlist' else 'Registration confirmed' end,
      case when new.status='waitlisted' then 'You are on the waitlist for '||coalesce(v_title,'this event')||'.' else 'Your registration for '||coalesce(v_title,'this event')||' is confirmed.' end,
      'registration',new.event_id);
  elsif new.status is distinct from old.status then
    if new.status='registered' and old.status='waitlisted' then
      insert into public.notifications(user_id,title,message,type,related_event_id) values(new.student_id,'Registration confirmed','A seat is confirmed for '||coalesce(v_title,'this event')||'.','registration',new.event_id);
    elsif new.status='cancelled' then
      insert into public.notifications(user_id,title,message,type,related_event_id) values(new.student_id,'Registration cancelled','Your registration for '||coalesce(v_title,'this event')||' was cancelled.','registration',new.event_id);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists registrations_notify_change on public.event_registrations;
create trigger registrations_notify_change after insert or update of status on public.event_registrations
for each row execute function public.notify_registration_change();

create or replace function public.notify_event_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_message text;
begin
  if new.status is distinct from old.status and new.status='cancelled' then
    v_message := 'The event '||new.title||' was cancelled.';
  elsif new.title is distinct from old.title or new.event_date is distinct from old.event_date
     or new.start_time is distinct from old.start_time or new.venue_text is distinct from old.venue_text
     or new.venue_id is distinct from old.venue_id then
    v_message := 'Event details changed for '||new.title||'. Please review the latest date, time and venue.';
    insert into public.notifications(user_id,title,message,type,related_event_id)
      select distinct r.student_id,'Event details updated',v_message,'event_update',new.id
      from public.event_registrations r where r.event_id=new.id and r.status='registered';
  end if;
  return new;
end $$;
drop trigger if exists events_notify_details_change on public.events;
create trigger events_notify_details_change after update on public.events
for each row execute function public.notify_event_changes();

-- Security/performance indexes for common real-world queries.
create index if not exists registrations_active_event_idx on public.event_registrations(event_id) where status='registered';
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
