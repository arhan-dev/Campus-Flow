-- CampusFlow: free-text venues, branch eligibility and organizer-scanned student passes.
-- Run this migration in Supabase SQL Editor after migrations 001-004.

alter table public.events add column if not exists venue_text text;
alter table public.events add column if not exists allowed_branches text[] not null default '{}';
update public.events e set venue_text = v.name from public.venues v where e.venue_id = v.id and (e.venue_text is null or trim(e.venue_text) = '');

alter table public.event_registrations add column if not exists full_name text;
alter table public.event_registrations add column if not exists roll_number text;
alter table public.event_registrations add column if not exists branch text;

-- Registration details and branch eligibility are enforced on the server, not only by the form.
create or replace function public.guard_registration_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_event public.events%rowtype; v_branch text; v_profile_branch text;
begin
  if auth.uid() is null then return new; end if;
  if not public.is_student() or new.student_id <> auth.uid() then
    raise exception 'CF_FORBIDDEN: Only students can manage their own registrations.';
  end if;
  select * into v_event from public.events where id = new.event_id;
  if not found then raise exception 'CF_EVENT_NOT_FOUND: Event not found.'; end if;
  select d.name into v_profile_branch from public.profiles p left join public.departments d on d.id = p.department_id where p.id = new.student_id;
  v_branch := nullif(trim(new.branch), '');
  if v_profile_branch is not null and lower(v_branch) <> lower(v_profile_branch) then
    raise exception 'CF_BRANCH_PROFILE_MISMATCH: Choose the branch saved in your student profile.';
  end if;
  if cardinality(coalesce(v_event.allowed_branches, '{}'::text[])) > 0 then
    if v_branch is null or not (v_branch = any(v_event.allowed_branches)) then
      raise exception 'CF_BRANCH_NOT_ELIGIBLE: This event is restricted to selected branches.';
    end if;
  end if;
  if new.status = 'registered' and (length(trim(coalesce(new.full_name,''))) = 0 or length(trim(coalesce(new.roll_number,''))) = 0 or length(trim(coalesce(new.branch,''))) = 0) then
    raise exception 'CF_REGISTRATION_DETAILS_REQUIRED: Full name, roll number and branch are required.';
  end if;
  new.full_name := nullif(trim(new.full_name), '');
  new.roll_number := nullif(trim(new.roll_number), '');
  new.branch := nullif(trim(new.branch), '');
  return new;
end $$;
drop trigger if exists registrations_guard_details on public.event_registrations;
create trigger registrations_guard_details before insert or update on public.event_registrations for each row execute function public.guard_registration_write();

-- Organizers scan the personal registration QR. The server validates organizer role,
-- registration, event day and duplicate check-in before granting entry.
create or replace function public.organizer_admit_registration(p_registration_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_reg public.event_registrations%rowtype; v_event public.events%rowtype; v_student public.profiles%rowtype; v_attendance public.attendance%rowtype;
begin
  if auth.uid() is null or not public.is_organizer() then
    raise exception 'CF_FORBIDDEN: Only event organisers can scan entry passes.';
  end if;
  select * into v_reg from public.event_registrations where id = p_registration_id and status = 'registered';
  if not found then raise exception 'CF_INVALID_PASS: This pass is invalid or registration was cancelled.'; end if;
  select * into v_event from public.events where id = v_reg.event_id;
  if v_event.status = 'cancelled' or not public.is_published_status(v_event.status) then
    raise exception 'CF_EVENT_NOT_OPEN: Entry is not available for this event.';
  end if;
  if v_event.event_date <> public.campus_today() then
    raise exception 'CF_WRONG_DAY: This entry pass can only be used on the event date.';
  end if;
  select * into v_student from public.profiles where id = v_reg.student_id;
  select * into v_attendance from public.attendance where event_id = v_reg.event_id and student_id = v_reg.student_id;
  if found and v_attendance.status = 'present' then
    raise exception 'CF_ALREADY_ADMITTED: This student has already been admitted.';
  end if;
  perform set_config('campusflow.qr_checkin', 'on', true);
  insert into public.attendance(event_id, student_id, registration_id, status, marked_by)
  values(v_reg.event_id, v_reg.student_id, v_reg.id, 'present', auth.uid())
  on conflict(event_id, student_id) do update set status='present', marked_at=now(), marked_by=auth.uid(), registration_id=v_reg.id;
  return jsonb_build_object('ok', true, 'event_id', v_event.id, 'event_title', v_event.title, 'student_id', v_student.id, 'student_name', coalesce(v_reg.full_name, v_student.full_name), 'roll_number', v_reg.roll_number, 'branch', v_reg.branch, 'status', 'present');
end $$;
revoke all on function public.organizer_admit_registration(uuid) from public, anon;
grant execute on function public.organizer_admit_registration(uuid) to authenticated;
