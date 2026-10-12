-- ============================================================================
-- CampusFlow final role-model smoke tests
-- Run ONLY after all four migrations (001 through 004) have succeeded.
-- Intended for the Supabase SQL Editor as the database owner. All test data is
-- created in a transaction and rolled back at the end.
--
-- Every returned row should say PASS. These are smoke/security regression
-- checks, not a replacement for full browser and end-to-end testing.
-- ============================================================================
begin;

create table public.zz_cf_test_results (
  n bigserial primary key,
  test_name text not null,
  result text not null check (result in ('PASS', 'FAIL')),
  detail text
);
grant select, insert on public.zz_cf_test_results to authenticated, anon;
grant usage, select on sequence public.zz_cf_test_results_n_seq to authenticated, anon;

-- Clear any request identity while setup runs as the SQL Editor owner.
select set_config('request.jwt.claims', '{"role":"postgres"}', true);

-- Use deterministic test identities; the whole transaction is rolled back.
insert into auth.users (id, email, aud, role, raw_user_meta_data)
values
  ('e0000000-0000-4000-8000-000000000001', 'cf-smoke-student@example.test', 'authenticated', 'authenticated', '{"full_name":"CampusFlow Smoke Student"}'),
  ('e0000000-0000-4000-8000-000000000002', 'cf-smoke-organizer@example.test', 'authenticated', 'authenticated', '{"full_name":"CampusFlow Smoke Organizer"}')
on conflict (id) do nothing;

-- Promotion is performed by the database owner for this isolated test only.
update public.profiles
set role = 'organizer'
where id = 'e0000000-0000-4000-8000-000000000002';

-- Confirm final role constraint rejects legacy roles.
do $$
begin
  begin
    update public.profiles set role = 'admin'
    where id = 'e0000000-0000-4000-8000-000000000001';
    insert into public.zz_cf_test_results(test_name, result, detail)
    values ('Legacy role is rejected', 'FAIL', 'The role admin was accepted.');
  exception when check_violation then
    insert into public.zz_cf_test_results(test_name, result, detail)
    values ('Legacy role is rejected', 'PASS', 'The final role constraint rejected admin.');
  end;
end $$;

-- Student context: role helper and profile isolation.
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  v_role text;
  v_count integer;
  v_rows integer;
begin
  v_role := public.current_app_role();
  insert into public.zz_cf_test_results(test_name, result, detail)
  values ('Student role resolves correctly', case when v_role = 'student' then 'PASS' else 'FAIL' end, coalesce(v_role, 'NULL'));

  insert into public.zz_cf_test_results(test_name, result, detail)
  values ('Student is not an organiser', case when not public.is_organizer() then 'PASS' else 'FAIL' end, 'is_organizer() must be false for students.');

  select count(*) into v_count from public.profiles where id = 'e0000000-0000-4000-8000-000000000002';
  insert into public.zz_cf_test_results(test_name, result, detail)
  values ('Student cannot read another profile', case when v_count = 0 then 'PASS' else 'FAIL' end, 'Visible other-profile rows: ' || v_count::text);

  begin
    update public.profiles set role = 'organizer'
    where id = auth.uid();
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      insert into public.zz_cf_test_results(test_name, result, detail)
      values ('Student cannot promote self', 'PASS', 'RLS prevented the update.');
    else
      insert into public.zz_cf_test_results(test_name, result, detail)
      values ('Student cannot promote self', 'FAIL', 'The update unexpectedly affected a row.');
    end if;
  exception when others then
    insert into public.zz_cf_test_results(test_name, result, detail)
    values ('Student cannot promote self', 'PASS', 'Update rejected: ' || sqlerrm);
  end;
end $$;
reset role;

-- Organiser context: helper and campus-wide profile visibility per the product model.
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
do $$
declare
  v_role text;
  v_count integer;
begin
  v_role := public.current_app_role();
  insert into public.zz_cf_test_results(test_name, result, detail)
  values ('Organiser role resolves correctly', case when v_role = 'organizer' then 'PASS' else 'FAIL' end, coalesce(v_role, 'NULL'));

  insert into public.zz_cf_test_results(test_name, result, detail)
  values ('Organiser helper resolves correctly', case when public.is_organizer() then 'PASS' else 'FAIL' end, 'is_organizer() must be true for organisers.');

  select count(*) into v_count from public.profiles
  where id in ('e0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002');
  insert into public.zz_cf_test_results(test_name, result, detail)
  values ('Organiser can read profiles needed for campus operations', case when v_count = 2 then 'PASS' else 'FAIL' end, 'Visible test profiles: ' || v_count::text);
end $$;
reset role;

-- Structural checks run as the SQL Editor owner.
insert into public.zz_cf_test_results(test_name, result, detail)
select 'Canonical organiser helper exists',
       case when to_regprocedure('public.is_organizer()') is not null then 'PASS' else 'FAIL' end,
       'Expected public.is_organizer().';

insert into public.zz_cf_test_results(test_name, result, detail)
select 'Final profile role constraint exists',
       case when exists (
         select 1 from pg_constraint
         where conrelid = 'public.profiles'::regclass
           and conname = 'profiles_role_check'
       ) then 'PASS' else 'FAIL' end,
       'Expected profiles_role_check on public.profiles.';

select test_name, result, detail
from public.zz_cf_test_results
order by n;

-- Roll back all test users and the temporary results table.
rollback;
