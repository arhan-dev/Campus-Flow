# CampusFlow Supabase SQL

## Migration order

For a new Supabase project, run these files in the SQL Editor in this exact order, one file at a time:

1. `migrations/001_initial_schema.sql`
2. `migrations/002_section7.sql`
3. `migrations/003_section8_hardening.sql`
4. `migrations/004_event_organizer_model.sql`
5. `migrations/005_lock_profile_roles.sql`
6. `migrations/006_event_branch_and_entry_qr.sql`
7. `migrations/007_organizer_branch_management.sql`
8. `migrations/008_production_event_workflows.sql`

Stop if any migration reports an error. Do not continue to later migrations until the error is resolved.

`004_event_organizer_model.sql` replaces the legacy `student` / `faculty` / `admin` role model with `student` / `organizer`. `005_lock_profile_roles.sql` prevents authenticated students and organisers from changing any profile role, status, or email; trusted SQL Editor changes remain possible.

## Seed data

After all migrations complete, run `seed.sql` if you want the reference departments, categories, venues, and clubs. Review the file before running it. It does not create production users.

## Final-model smoke tests

After migrations (and optionally seed data) complete, run `tests/final_model_tests.sql` in the Supabase SQL Editor. It creates test records inside a transaction and rolls them back. Every returned result should say `PASS`.

The files under `tests/legacy_pre_004/` are retained only for historical reference. They target the earlier faculty/admin schema and must not be run against the final organizer model.

## Promoting an organiser

Use `promote-user.sql` only from the trusted SQL Editor/database-owner context, after reviewing the file and replacing its example email with the intended account. Never expose database-owner credentials or service-role keys in frontend code.

## Security reminders

- The frontend must use only the Supabase project URL and publishable/anon key.
- Never put the database password or service-role/secret key in `VITE_*` variables.
- Keep RLS enabled on tables containing user or event data.
- Test policies using real student and organiser sessions before production use.
- The smoke tests are not a substitute for full end-to-end security testing.

## Production workflow upgrade (migration 008)

For a brand-new Supabase project, run migrations `001` through `008` in numeric order, one file at a time. Do not skip migrations or run them out of order. Migration 008 includes the final compatible registration guard and a single registration notification trigger. It adds atomic registration, capacity enforcement, optional waitlisting, waitlist promotion on cancellation, and event-change notifications. The frontend calls `register_for_event` and `cancel_event_registration` so critical checks run in the database.

After all eight migrations complete successfully, optionally run `seed.sql`, then run `tests/final_model_tests.sql` and follow `tests/production_smoke_test.md`. A successful SQL run is not a substitute for verifying real student/organizer sessions and the deployed frontend.
