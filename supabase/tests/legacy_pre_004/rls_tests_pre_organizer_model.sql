-- ============================================================================
-- CampusFlow - database security and rules test
-- HOW TO RUN: after running migrations/001_initial_schema.sql and seed.sql, open the Supabase
-- SQL Editor, paste this whole file and press Run. It runs inside one transaction and ROLLS BACK
-- at the end, so it leaves no data behind. Read the result table that is returned at the end:
-- every row should say PASS.
--
-- NOTE: This file was written together with the schema but could NOT be executed in the build
-- environment (no PostgreSQL available there). Run it yourself and treat any FAIL as a real bug.
-- ============================================================================
begin;

create table public.zz_test_results (n serial, name text, ok boolean);
grant all on public.zz_test_results to anon, authenticated;
grant usage, select on sequence public.zz_test_results_n_seq to anon, authenticated;

-- ---- Test users (as the database owner). The signup trigger creates their profiles as students. ----
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-000000000001', 'test.admin@example.test',  'authenticated', 'authenticated', '{"full_name":"Test Admin"}'),
  ('a0000000-0000-4000-8000-000000000002', 'test.facA@example.test',   'authenticated', 'authenticated', '{"full_name":"Test Faculty A", "role":"admin"}'),
  ('a0000000-0000-4000-8000-000000000003', 'test.facB@example.test',   'authenticated', 'authenticated', '{"full_name":"Test Faculty B"}'),
  ('a0000000-0000-4000-8000-000000000004', 'test.stuA@example.test',   'authenticated', 'authenticated', '{"full_name":"Test Student A"}'),
  ('a0000000-0000-4000-8000-000000000005', 'test.stuB@example.test',   'authenticated', 'authenticated', '{"full_name":"Test Student B"}');

do $$ begin
  insert into public.zz_test_results (name, ok)
  values ('Signup metadata cannot create an admin (role stays student)',
          (select role from public.profiles where id = 'a0000000-0000-4000-8000-000000000002') = 'student');
end $$;

-- Promote the staff accounts (owner context: auth.uid() is null, so the guard allows it)
update public.profiles set role = 'admin'   where id = 'a0000000-0000-4000-8000-000000000001';
update public.profiles set role = 'faculty' where id in ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003');

-- ---- Test events (as owner) ----
insert into public.events (id, title, category_id, organizer_id, venue_id, event_date, start_time, capacity, status, registration_deadline)
select 'b0000000-0000-4000-8000-000000000001', 'Test open event', (select id from public.event_categories order by name limit 1),
       'a0000000-0000-4000-8000-000000000002', (select id from public.venues order by name limit 1), current_date + 5, '10:00', 1, 'registration_open', current_date + 4;
insert into public.events (id, title, category_id, organizer_id, venue_id, event_date, start_time, capacity, status)
select 'b0000000-0000-4000-8000-000000000002', 'Test draft event', (select id from public.event_categories order by name limit 1),
       'a0000000-0000-4000-8000-000000000003', (select id from public.venues order by name limit 1), current_date + 9, '10:00', 10, 'draft';
insert into public.events (id, title, category_id, organizer_id, venue_id, event_date, start_time, capacity, status, submitted_at)
select 'b0000000-0000-4000-8000-000000000003', 'Test pending event', (select id from public.event_categories order by name limit 1),
       'a0000000-0000-4000-8000-000000000002', (select id from public.venues order by name limit 1), current_date + 9, '10:00', 10, 'pending_approval', now();
insert into public.events (id, title, category_id, organizer_id, venue_id, event_date, start_time, capacity, status)
select 'b0000000-0000-4000-8000-000000000004', 'Test event today', (select id from public.event_categories order by name limit 1),
       'a0000000-0000-4000-8000-000000000002', (select id from public.venues order by name limit 1), current_date, '10:00', 10, 'registration_open';

-- ============================ ANONYMOUS VISITOR ============================
set local role anon;
do $$ declare c int; begin
  select count(*) into c from public.events where id = 'b0000000-0000-4000-8000-000000000002';
  insert into public.zz_test_results (name, ok) values ('Anon cannot see a draft event', c = 0);
  select count(*) into c from public.events where id = 'b0000000-0000-4000-8000-000000000001';
  insert into public.zz_test_results (name, ok) values ('Anon can see a published event', c = 1);
  begin
    perform 1 from public.profiles limit 1;
    insert into public.zz_test_results (name, ok) values ('Anon cannot read profiles', false);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Anon cannot read profiles', true);
  end;
end $$;
reset role;

-- ============================ STUDENT A ============================
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
do $$ declare c int; begin
  -- register
  begin
    insert into public.event_registrations (event_id, student_id) values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004');
    insert into public.zz_test_results (name, ok) values ('Student can register for an open event', true);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Student can register for an open event', false);
  end;
  -- duplicate
  begin
    insert into public.event_registrations (event_id, student_id) values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004');
    insert into public.zz_test_results (name, ok) values ('Duplicate registration is blocked', false);
  exception when unique_violation then
    insert into public.zz_test_results (name, ok) values ('Duplicate registration is blocked', true);
  when others then
    insert into public.zz_test_results (name, ok) values ('Duplicate registration is blocked', false);
  end;
  -- registering someone else
  begin
    insert into public.event_registrations (event_id, student_id) values ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000005');
    insert into public.zz_test_results (name, ok) values ('Student cannot register another student', false);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Student cannot register another student', true);
  end;
  -- unpublished event
  begin
    insert into public.event_registrations (event_id, student_id) values ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004');
    insert into public.zz_test_results (name, ok) values ('Student cannot register for an unpublished event', false);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Student cannot register for an unpublished event', true);
  end;
  -- cannot create events
  begin
    insert into public.events (title, category_id, venue_id, event_date, start_time, capacity, status)
    select 'Hack', (select id from public.event_categories limit 1), (select id from public.venues limit 1), current_date + 3, '10:00', 5, 'draft';
    insert into public.zz_test_results (name, ok) values ('Student cannot create an event', false);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Student cannot create an event', true);
  end;
  -- cannot approve
  update public.events set status = 'approved' where id = 'b0000000-0000-4000-8000-000000000003';
  get diagnostics c = row_count;
  insert into public.zz_test_results (name, ok) values ('Student cannot approve an event', c = 0);
  -- cannot change own role
  begin
    update public.profiles set role = 'admin' where id = 'a0000000-0000-4000-8000-000000000004';
    insert into public.zz_test_results (name, ok) values ('Student cannot make themselves admin', false);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Student cannot make themselves admin', true);
  end;
  -- cannot write notifications / points
  begin
    insert into public.notifications (user_id, title, message) values ('a0000000-0000-4000-8000-000000000004', 'x', 'y');
    insert into public.zz_test_results (name, ok) values ('Student cannot insert notifications', false);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Student cannot insert notifications', true);
  end;
  begin
    insert into public.participation_points (student_id, event_id, points, reason) values ('a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 500, 'Winner');
    insert into public.zz_test_results (name, ok) values ('Student cannot award themselves points', false);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Student cannot award themselves points', true);
  end;
  -- gets a confirmation notification from the trigger
  select count(*) into c from public.notifications where user_id = 'a0000000-0000-4000-8000-000000000004' and type = 'registration';
  insert into public.zz_test_results (name, ok) values ('Registration creates a notification for the student', c = 1);
end $$;
reset role;

-- ============================ STUDENT B ============================
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
set local role authenticated;
do $$ declare c int; begin
  select count(*) into c from public.event_registrations;
  insert into public.zz_test_results (name, ok) values ('Student B cannot see Student A registrations', c = 0);
  select count(*) into c from public.notifications;
  insert into public.zz_test_results (name, ok) values ('Student B cannot see Student A notifications', c = 0);
  update public.event_registrations set status = 'cancelled' where student_id = 'a0000000-0000-4000-8000-000000000004';
  get diagnostics c = row_count;
  insert into public.zz_test_results (name, ok) values ('Student B cannot cancel Student A registration', c = 0);
  -- capacity (event 1 has 1 seat and Student A holds it)
  begin
    insert into public.event_registrations (event_id, student_id) values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005');
    insert into public.zz_test_results (name, ok) values ('Registration is refused when the event is full', false);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Registration is refused when the event is full', sqlerrm like 'CF_EVENT_FULL%');
  end;
end $$;
reset role;

-- ============================ FACULTY A (owns events 1, 3, 4) ============================
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
do $$ declare c int; new_id uuid; begin
  select count(*) into c from public.event_registrations where event_id = 'b0000000-0000-4000-8000-000000000001';
  insert into public.zz_test_results (name, ok) values ('Faculty sees registrations for their own event', c = 1);
  -- other faculty draft hidden
  select count(*) into c from public.events where id = 'b0000000-0000-4000-8000-000000000002';
  insert into public.zz_test_results (name, ok) values ('Faculty cannot see another faculty draft', c = 0);
  update public.events set title = 'hijack' where id = 'b0000000-0000-4000-8000-000000000002';
  get diagnostics c = row_count;
  insert into public.zz_test_results (name, ok) values ('Faculty cannot edit another faculty event', c = 0);
  -- create a draft: organizer is forced to the caller
  insert into public.events (title, category_id, venue_id, event_date, start_time, capacity, status, organizer_id)
  select 'Faculty draft', (select id from public.event_categories limit 1), (select id from public.venues limit 1), current_date + 7, '09:00', 20, 'draft', 'a0000000-0000-4000-8000-000000000003'
  returning id into new_id;
  select count(*) into c from public.events where id = new_id and organizer_id = 'a0000000-0000-4000-8000-000000000002';
  insert into public.zz_test_results (name, ok) values ('Faculty-created event is owned by the creator (organizer forced)', c = 1);
  -- cannot create as approved
  begin
    insert into public.events (title, category_id, venue_id, event_date, start_time, capacity, status)
    select 'Self approved', (select id from public.event_categories limit 1), (select id from public.venues limit 1), current_date + 7, '09:00', 20, 'approved';
    insert into public.zz_test_results (name, ok) values ('Faculty cannot create an event as approved', false);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Faculty cannot create an event as approved', true);
  end;
  -- cannot approve own pending event
  begin
    update public.events set status = 'approved' where id = 'b0000000-0000-4000-8000-000000000003';
    insert into public.zz_test_results (name, ok) values ('Faculty cannot approve their own event', false);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Faculty cannot approve their own event', true);
  end;
  -- can submit the draft
  update public.events set status = 'pending_approval' where id = new_id;
  get diagnostics c = row_count;
  insert into public.zz_test_results (name, ok) values ('Faculty can submit their draft for approval', c = 1);
  -- attendance
  begin
    insert into public.attendance (event_id, student_id, status) values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 'present');
    insert into public.zz_test_results (name, ok) values ('Faculty can mark a registered student present', true);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Faculty can mark a registered student present', false);
  end;
  begin
    insert into public.attendance (event_id, student_id, status) values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005', 'present');
    insert into public.zz_test_results (name, ok) values ('Attendance for a non-registered student is refused', false);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Attendance for a non-registered student is refused', true);
  end;
  -- certificate rules
  begin
    insert into public.certificates (event_id, student_id, certificate_type) values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 'participation');
    insert into public.zz_test_results (name, ok) values ('Faculty can issue a certificate to a present student', true);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Faculty can issue a certificate to a present student', false);
  end;
  -- announcements
  begin
    insert into public.announcements (title, message, event_id, audience, created_by)
    values ('Test', 'Test message', 'b0000000-0000-4000-8000-000000000002', 'registered_participants', 'a0000000-0000-4000-8000-000000000002');
    insert into public.zz_test_results (name, ok) values ('Faculty cannot announce on another faculty event', false);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Faculty cannot announce on another faculty event', true);
  end;
  begin
    insert into public.announcements (title, message, audience, created_by) values ('Everyone', 'Hello all', 'all_students', 'a0000000-0000-4000-8000-000000000002');
    insert into public.zz_test_results (name, ok) values ('Faculty cannot send a campus-wide announcement', false);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Faculty cannot send a campus-wide announcement', true);
  end;
  -- admin only tables
  begin
    update public.venues set status = 'maintenance';
    get diagnostics c = row_count;
    insert into public.zz_test_results (name, ok) values ('Faculty cannot change venues', c = 0);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Faculty cannot change venues', true);
  end;
end $$;
reset role;

-- ============================ STUDENT A again (points, certificate, feedback) ============================
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
set local role authenticated;
do $$ declare c int; begin
  select coalesce(sum(points), 0) into c from public.participation_points where student_id = 'a0000000-0000-4000-8000-000000000004';
  insert into public.zz_test_results (name, ok) values ('Being marked present awards 10 participation points', c = 10);
  select count(*) into c from public.attendance;
  insert into public.zz_test_results (name, ok) values ('Student sees only their own attendance', c = 1);
  select count(*) into c from public.certificates where student_id = 'a0000000-0000-4000-8000-000000000004' and certificate_number like 'CF-%' and verification_code is not null;
  insert into public.zz_test_results (name, ok) values ('Certificate got a number and verification code from the database', c = 1);
  -- feedback only for events that have taken place and were attended: event 1 is in the future
  begin
    insert into public.feedback (event_id, student_id, organization_rating, content_rating, speaker_rating, venue_rating, overall_rating)
    values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 5, 5, 5, 5, 5);
    insert into public.zz_test_results (name, ok) values ('Feedback is refused before the event has taken place', false);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Feedback is refused before the event has taken place', sqlerrm like 'CF_FEEDBACK_NOT_ALLOWED%');
  end;
end $$;
reset role;

-- ============================ ADMIN ============================
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$ declare c int; begin
  select count(*) into c from public.events where id in ('b0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003');
  insert into public.zz_test_results (name, ok) values ('Admin sees draft and pending events', c = 2);
  begin
    update public.events set status = 'rejected' where id = 'b0000000-0000-4000-8000-000000000003';
    insert into public.zz_test_results (name, ok) values ('Rejection without a reason is refused', false);
  exception when others then
    insert into public.zz_test_results (name, ok) values ('Rejection without a reason is refused', sqlerrm like 'CF_REASON_REQUIRED%');
  end;
  update public.events set status = 'approved' where id = 'b0000000-0000-4000-8000-000000000003';
  select count(*) into c from public.events where id = 'b0000000-0000-4000-8000-000000000003' and status = 'approved'
    and approved_by = 'a0000000-0000-4000-8000-000000000001' and approved_at is not null;
  insert into public.zz_test_results (name, ok) values ('Admin approval sets approved_by and approved_at', c = 1);
  select count(*) into c from public.profiles;
  insert into public.zz_test_results (name, ok) values ('Admin can read all profiles', c >= 5);
  update public.venues set status = 'maintenance' where id = (select id from public.venues order by name limit 1);
  get diagnostics c = row_count;
  insert into public.zz_test_results (name, ok) values ('Admin can change a venue', c = 1);
  select count(*) into c from public.notifications where user_id = 'a0000000-0000-4000-8000-000000000002' and type = 'approval';
  insert into public.zz_test_results (name, ok) values ('Organizer was notified of the approval', c >= 1);
end $$;
reset role;

select n, name, case when ok then 'PASS' else 'FAIL' end as result from public.zz_test_results order by n;
rollback;
