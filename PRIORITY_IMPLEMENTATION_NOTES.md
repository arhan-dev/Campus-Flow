# CampusFlow priorities implementation notes

This bundle builds on the existing CampusFlow implementation rather than replacing it.

## Included in this bundle

1. **Reliable registration** — frontend now calls `register_for_event`; migration 008 serializes registrations per event, enforces deadlines/branch eligibility/capacity at the database layer, prevents duplicate active registrations, and supports a waitlist.
2. **Waitlist lifecycle** — waitlisted registrations are visibly labeled in student event lists; cancellation is handled by `cancel_event_registration`, which promotes the oldest waitlisted participant when a confirmed seat is released.
3. **QR attendance** — preserves the existing organizer camera scanner and server-side `organizer_admit_registration` flow. Validate it using the production smoke-test checklist.
4. **Certificates** — preserves the existing batch issuance, PDF download, and public verification flows. Validate eligibility and RLS using the checklist.
5. **Notifications** — migration 008 adds database notifications for registration confirmation, waitlisting, cancellation, waitlist promotion, and event date/time/venue changes. Existing notification screens remain in use.
6. **Analytics/security QA** — analytics adds event/date filters and a branch participation chart; the smoke-test checklist covers the complete workflows and permission boundaries.

## Required Supabase action

After migrations 001-007 are already applied, run `supabase/migrations/008_production_event_workflows.sql` in the Supabase SQL Editor. Confirm it completes without errors. Then follow `supabase/tests/production_smoke_test.md`.

## Important validation note

The Vite production build could not be run in this packaging environment because npm dependency installation timed out and the Vite executable was unavailable. Run `npm ci` and `npm run build` in Termux or another Node environment before deployment. Do not describe the project as production-verified until the migration and all smoke tests pass on the target Supabase project.
