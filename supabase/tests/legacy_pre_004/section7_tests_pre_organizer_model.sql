-- ============================================================================
-- CampusFlow - Section 7 database tests (lifecycle, QR check-in, cancellation, certificates, roles, gallery)
-- HOW TO RUN: after 001_initial_schema.sql, seed.sql and 002_section7.sql, paste this file into the Supabase SQL Editor
-- and press Run. It runs in one transaction and ROLLS BACK, so it leaves no data. Every result row should say PASS.
--
-- NOTE: This file was written together with the migration but has NOT been executed (no PostgreSQL in the build
-- environment). Run it yourself and treat any FAIL as a real bug. Dates are computed from public.campus_today(),
-- so the tests follow the configured campus time zone.
-- ============================================================================
begin;

create table public.zz_results (n serial, name text, ok boolean);
grant all on public.zz_results to anon, authenticated;
grant usage, select on sequence public.zz_results_n_seq to anon, authenticated;

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('a0000000-0000-4000-8000-000000000011', 's7.admin@example.test',  'authenticated', 'authenticated', '{"full_name":"S7 Admin"}'),
  ('a0000000-0000-4000-8000-000000000012', 's7.admin2@example.test', 'authenticated', 'authenticated', '{"full_name":"S7 Admin Two"}'),
  ('a0000000-0000-4000-8000-000000000013', 's7.facA@example.test',   'authenticated', 'authenticated', '{"full_name":"S7 Faculty A"}'),
  ('a0000000-0000-4000-8000-000000000014', 's7.facB@example.test',   'authenticated', 'authenticated', '{"full_name":"S7 Faculty B"}'),
  ('a0000000-0000-4000-8000-000000000015', 's7.stuA@example.test',   'authenticated', 'authenticated', '{"full_name":"Asha Verma"}'),
  ('a0000000-0000-4000-8000-000000000016', 's7.stuB@example.test',   'authenticated', 'authenticated', '{"full_name":"Ben Other"}');
update public.profiles set role = 'admin'   where id in ('a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000012');
update public.profiles set role = 'faculty' where id in ('a0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000014');

-- Events (owner context). E1 open for registration, E2 opens in the future, E3 deadline passed, E4 ended,
-- E5 today at 23:50 (QR check-in; registration still open), E6 to cancel, E7 today from 00:00 (already started).
-- Run these tests outside 23:50-24:00 campus time, or E5 will already be ongoing.
insert into public.events (id, title, category_id, organizer_id, venue_id, event_date, start_time, end_time, capacity, status, registration_deadline, registration_opens_on)
select v.id::uuid, v.title, (select id from public.event_categories order by name limit 1), 'a0000000-0000-4000-8000-000000000013',
       (select id from public.venues order by name limit 1), v.d, v.st::time, v.et::time, 10, v.status, v.dl, v.op
from (values
  ('b0000000-0000-4000-8000-000000000101', 'S7 open',        public.campus_today() + 5, '10:00', '12:00', 'approved',          public.campus_today() + 4, null::date),
  ('b0000000-0000-4000-8000-000000000102', 'S7 not yet open', public.campus_today() + 9, '10:00', '12:00', 'approved',         public.campus_today() + 8, public.campus_today() + 3),
  ('b0000000-0000-4000-8000-000000000103', 'S7 deadline gone', public.campus_today() + 2, '10:00', '12:00', 'registration_open', public.campus_today() - 1, null::date),
  ('b0000000-0000-4000-8000-000000000104', 'S7 ended',       public.campus_today() - 3, '10:00', '12:00', 'registration_open', public.campus_today() - 5, null::date),
  ('b0000000-0000-4000-8000-000000000105', 'S7 today',       public.campus_today(),     '23:50', '23:59', 'approved',          public.campus_today(),     null::date),
  ('b0000000-0000-4000-8000-000000000106', 'S7 to cancel',   public.campus_today() + 6, '10:00', '12:00', 'approved',          public.campus_today() + 5, null::date),
  ('b0000000-0000-4000-8000-000000000107', 'S7 started',     public.campus_today(),     '00:00', '23:59', 'approved',          public.campus_today(),     null::date)
) as v(id, title, d, st, et, status, dl, op);

-- ============================ LIFECYCLE (computed from dates) ============================
do $$ begin
  insert into public.zz_results (name, ok) values
   ('Open event computes to registration_open', (select public.compute_event_status(e) from public.events e where id = 'b0000000-0000-4000-8000-000000000101') = 'registration_open'),
   ('Event before its registration start computes to approved', (select public.compute_event_status(e) from public.events e where id = 'b0000000-0000-4000-8000-000000000102') = 'approved'),
   ('Event after its deadline computes to registration_closed', (select public.compute_event_status(e) from public.events e where id = 'b0000000-0000-4000-8000-000000000103') = 'registration_closed'),
   ('Event that has ended computes to completed', (select public.compute_event_status(e) from public.events e where id = 'b0000000-0000-4000-8000-000000000104') = 'completed'),
   ('Event running now computes to ongoing', (select public.compute_event_status(e) from public.events e where id = 'b0000000-0000-4000-8000-000000000107') = 'ongoing');
  perform public.sync_event_lifecycle();
  insert into public.zz_results (name, ok) values
   ('sync_event_lifecycle writes the stage (stale approved -> registration_open)', (select status from public.events where id = 'b0000000-0000-4000-8000-000000000101') = 'registration_open'),
   ('sync_event_lifecycle writes completed for the ended event', (select status from public.events where id = 'b0000000-0000-4000-8000-000000000104') = 'completed');
end $$;

-- ============================ STUDENT A ============================
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000015","role":"authenticated"}', true);
set local role authenticated;
do $$ declare c int; begin
  -- stale stored status must not allow an invalid registration: force E3 back to a stale 'registration_open' as owner is not possible here,
  -- so test the refusals directly
  begin insert into public.event_registrations (event_id, student_id) values ('b0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000015');
        insert into public.zz_results (name, ok) values ('Registration before it opens is refused', false);
  exception when others then insert into public.zz_results (name, ok) values ('Registration before it opens is refused', sqlerrm like 'CF_REGISTRATION_NOT_OPEN%'); end;
  begin insert into public.event_registrations (event_id, student_id) values ('b0000000-0000-4000-8000-000000000103', 'a0000000-0000-4000-8000-000000000015');
        insert into public.zz_results (name, ok) values ('Registration after the deadline is refused', false);
  exception when others then insert into public.zz_results (name, ok) values ('Registration after the deadline is refused', sqlerrm like 'CF_DEADLINE_PASSED%'); end;
  begin insert into public.event_registrations (event_id, student_id) values ('b0000000-0000-4000-8000-000000000104', 'a0000000-0000-4000-8000-000000000015');
        insert into public.zz_results (name, ok) values ('Registration for an ended event is refused', false);
  exception when others then insert into public.zz_results (name, ok) values ('Registration for an ended event is refused', sqlerrm like 'CF_EVENT_ENDED%'); end;
  begin insert into public.event_registrations (event_id, student_id) values ('b0000000-0000-4000-8000-000000000107', 'a0000000-0000-4000-8000-000000000015');
        insert into public.zz_results (name, ok) values ('Registration once the event has started is refused', false);
  exception when others then insert into public.zz_results (name, ok) values ('Registration once the event has started is refused', sqlerrm like 'CF_REGISTRATION_CLOSED%'); end;
  begin insert into public.event_registrations (event_id, student_id) values ('b0000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000015');
        insert into public.zz_results (name, ok) values ('Registration while open is accepted', true);
  exception when others then insert into public.zz_results (name, ok) values ('Registration while open is accepted', false); end;
  insert into public.event_registrations (event_id, student_id) values ('b0000000-0000-4000-8000-000000000106', 'a0000000-0000-4000-8000-000000000015');
  insert into public.event_registrations (event_id, student_id) values ('b0000000-0000-4000-8000-000000000105', 'a0000000-0000-4000-8000-000000000015');
  -- cannot elevate
  begin update public.profiles set role = 'admin' where id = 'a0000000-0000-4000-8000-000000000015';
        insert into public.zz_results (name, ok) values ('Student cannot change own role', false);
  exception when others then insert into public.zz_results (name, ok) values ('Student cannot change own role', true); end;
  -- public-safe views
  select count(*) into c from public.event_live_status where event_id = 'b0000000-0000-4000-8000-000000000101';
  insert into public.zz_results (name, ok) values ('Student can read live status of a published event', c = 1);
  -- QR sessions are not readable or creatable by students
  select count(*) into c from public.attendance_sessions;
  insert into public.zz_results (name, ok) values ('Student cannot read attendance sessions', c = 0);
  begin perform public.open_attendance_session('b0000000-0000-4000-8000-000000000105', 60);
        insert into public.zz_results (name, ok) values ('Student cannot open an attendance session', false);
  exception when others then insert into public.zz_results (name, ok) values ('Student cannot open an attendance session', sqlerrm like 'CF_FORBIDDEN%'); end;
end $$;
reset role;

-- ============================ FACULTY B (not the owner) ============================
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000014","role":"authenticated"}', true);
set local role authenticated;
do $$ begin
  begin perform public.open_attendance_session('b0000000-0000-4000-8000-000000000105', 60);
        insert into public.zz_results (name, ok) values ('Other faculty cannot open QR attendance for this event', false);
  exception when others then insert into public.zz_results (name, ok) values ('Other faculty cannot open QR attendance for this event', sqlerrm like 'CF_FORBIDDEN%'); end;
  begin update public.events set status = 'cancelled', cancellation_reason = 'x' where id = 'b0000000-0000-4000-8000-000000000106';
        insert into public.zz_results (name, ok) values ('Other faculty cannot cancel this event', (select status from public.events where id = 'b0000000-0000-4000-8000-000000000106') = 'registration_open');
  exception when others then insert into public.zz_results (name, ok) values ('Other faculty cannot cancel this event', true); end;
end $$;
reset role;

create table zz_code (code text);
grant all on zz_code to authenticated, anon;

-- ============================ FACULTY A (owner): QR session, cancellation, certificate ============================
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000013","role":"authenticated"}', true);
set local role authenticated;
do $$ declare s jsonb; c int; begin
  begin perform public.open_attendance_session('b0000000-0000-4000-8000-000000000101', 60);
        insert into public.zz_results (name, ok) values ('QR session cannot be opened on a day other than the event day', false);
  exception when others then insert into public.zz_results (name, ok) values ('QR session cannot be opened on a day other than the event day', sqlerrm like 'CF_ATTENDANCE_NOT_OPEN%'); end;
  s := public.open_attendance_session('b0000000-0000-4000-8000-000000000105', 60);
  insert into public.zz_results (name, ok) values ('Owner can open a QR session on the event day', s ->> 'code' ~ '^[0-9A-F]{12}$');
  insert into zz_code values (s ->> 'code');
  select count(*) into c from public.attendance_sessions where event_id = 'b0000000-0000-4000-8000-000000000105' and closed_at is null;
  insert into public.zz_results (name, ok) values ('Exactly one open session per event', c = 1);

  -- cancellation needs a reason
  begin update public.events set status = 'cancelled' where id = 'b0000000-0000-4000-8000-000000000106';
        insert into public.zz_results (name, ok) values ('Cancellation without a reason is refused', false);
  exception when others then insert into public.zz_results (name, ok) values ('Cancellation without a reason is refused', sqlerrm like 'CF_REASON_REQUIRED%'); end;
  update public.events set status = 'cancelled', cancellation_reason = 'Speaker unavailable' where id = 'b0000000-0000-4000-8000-000000000106';
  insert into public.zz_results (name, ok) values ('Owner can cancel an approved event (row kept, status cancelled)',
    (select status from public.events where id = 'b0000000-0000-4000-8000-000000000106') = 'cancelled');
  select count(*) into c from public.event_registrations where event_id = 'b0000000-0000-4000-8000-000000000106' and status = 'registered';
  insert into public.zz_results (name, ok) values ('Cancellation keeps the registration history', c = 1);
  begin update public.events set status = 'registration_open' where id = 'b0000000-0000-4000-8000-000000000106';
        insert into public.zz_results (name, ok) values ('A cancelled event cannot be reopened', false);
  exception when others then insert into public.zz_results (name, ok) values ('A cancelled event cannot be reopened', true); end;
  begin update public.events set status = 'cancelled', cancellation_reason = 'late' where id = 'b0000000-0000-4000-8000-000000000104';
        insert into public.zz_results (name, ok) values ('An event that already took place cannot be cancelled', false);
  exception when others then insert into public.zz_results (name, ok) values ('An event that already took place cannot be cancelled', true); end;
end $$;
reset role;

-- ============================ STUDENT A: QR check-in ============================
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000015","role":"authenticated"}', true);
set local role authenticated;
do $$ declare r jsonb; v_code text; begin
  select z.code into v_code from zz_code z;
  begin perform public.check_in_with_code('ZZZZ-ZZZZ-ZZZZ');
        insert into public.zz_results (name, ok) values ('A wrong code is refused', false);
  exception when others then insert into public.zz_results (name, ok) values ('A wrong code is refused', sqlerrm like 'CF_INVALID_CODE%'); end;
  r := public.check_in_with_code(v_code);
  insert into public.zz_results (name, ok) values ('A registered student can check in with a valid code', r ->> 'status' = 'present');
  insert into public.zz_results (name, ok) values ('QR check-in records method = qr', (select method from public.attendance where event_id = 'b0000000-0000-4000-8000-000000000105' and student_id = 'a0000000-0000-4000-8000-000000000015') = 'qr');
  begin perform public.check_in_with_code(v_code);
        insert into public.zz_results (name, ok) values ('A second check-in is refused (no duplicates)', false);
  exception when others then insert into public.zz_results (name, ok) values ('A second check-in is refused (no duplicates)', sqlerrm like 'CF_ALREADY_MARKED%'); end;
  begin update public.event_registrations set status = 'cancelled' where event_id = 'b0000000-0000-4000-8000-000000000105' and student_id = 'a0000000-0000-4000-8000-000000000015';
        insert into public.zz_results (name, ok) values ('A student marked present cannot cancel the registration', false);
  exception when others then insert into public.zz_results (name, ok) values ('A student marked present cannot cancel the registration', sqlerrm like 'CF_CANCEL_NOT_ALLOWED%'); end;
end $$;
reset role;

-- ============================ STUDENT B: not registered ============================
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000016","role":"authenticated"}', true);
set local role authenticated;
do $$ declare v_code text; begin
  select z.code into v_code from zz_code z;
  begin perform public.check_in_with_code(v_code);
        insert into public.zz_results (name, ok) values ('A student who is not registered cannot check in', false);
  exception when others then insert into public.zz_results (name, ok) values ('A student who is not registered cannot check in', sqlerrm like 'CF_NOT_REGISTERED%'); end;
end $$;
reset role;

-- ============================ FACULTY A: close session, certificate ============================
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000013","role":"authenticated"}', true);
set local role authenticated;
do $$ declare v_code text; begin
  select z.code into v_code from zz_code z;
  perform public.close_attendance_session('b0000000-0000-4000-8000-000000000105');
  begin perform public.check_in_with_code(v_code);
        insert into public.zz_results (name, ok) values ('A closed session refuses check-in', false);
  exception when others then insert into public.zz_results (name, ok) values ('A closed session refuses check-in', sqlerrm like 'CF_SESSION_CLOSED%'); end;
  insert into public.certificates (event_id, student_id, certificate_type) values ('b0000000-0000-4000-8000-000000000105', 'a0000000-0000-4000-8000-000000000015', 'participation');
  insert into public.zz_results (name, ok) values ('Certificate issued to the present student', true);
end $$;
reset role;

-- ============================ PUBLIC CERTIFICATE VERIFICATION (anonymous) ============================
create table zz_cert as select verification_code as code, certificate_number as num from public.certificates
  where event_id = 'b0000000-0000-4000-8000-000000000105' and student_id = 'a0000000-0000-4000-8000-000000000015';
grant select on zz_cert to anon;
set local role anon;
do $$ declare v_code text; v_num text; r jsonb; begin
  -- anon cannot read the table, so take the values through a temp holder created before switching role
  select z.code, z.num into v_code, v_num from zz_cert z;
  r := public.verify_certificate(v_code);
  insert into public.zz_results (name, ok) values ('Anyone can verify a certificate by its verification code', (r ->> 'found')::boolean and (r ->> 'valid')::boolean);
  insert into public.zz_results (name, ok) values ('Verification by code shows the full recipient name', r ->> 'recipient' = 'Asha Verma');
  r := public.verify_certificate(v_num);
  insert into public.zz_results (name, ok) values ('Verification by certificate number masks the recipient name', r ->> 'recipient' = 'A*** V****');
  insert into public.zz_results (name, ok) values ('Verification result has no internal ids', not (r ? 'id' or r ? 'student_id' or r ? 'event_id'));
  insert into public.zz_results (name, ok) values ('An unknown code is reported as not found', not (public.verify_certificate('NOSUCHCODE1') ->> 'found')::boolean);
  begin perform 1 from public.certificates limit 1;
        insert into public.zz_results (name, ok) values ('Anonymous users cannot read the certificates table', false);
  exception when others then insert into public.zz_results (name, ok) values ('Anonymous users cannot read the certificates table', true); end;
end $$;
reset role;

-- ============================ ROLE MANAGEMENT (admin) ============================
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000011","role":"authenticated"}', true);
set local role authenticated;
do $$ declare c int; begin
  update public.profiles set role = 'faculty' where id = 'a0000000-0000-4000-8000-000000000015';
  insert into public.zz_results (name, ok) values ('Admin can change another user role', (select role from public.profiles where id = 'a0000000-0000-4000-8000-000000000015') = 'faculty');
  select count(*) into c from public.profile_changes where profile_id = 'a0000000-0000-4000-8000-000000000015' and field = 'role' and changed_by = 'a0000000-0000-4000-8000-000000000011';
  insert into public.zz_results (name, ok) values ('The role change is logged with the admin who made it', c = 1);
  begin update public.profiles set role = 'student' where id = 'a0000000-0000-4000-8000-000000000011';
        insert into public.zz_results (name, ok) values ('Admin cannot change their own role', false);
  exception when others then insert into public.zz_results (name, ok) values ('Admin cannot change their own role', sqlerrm like 'CF_SELF_CHANGE%'); end;
end $$;
reset role;

select n, name, case when ok then 'PASS' else 'FAIL' end as result from public.zz_results order by n;
rollback;
