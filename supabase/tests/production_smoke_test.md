# CampusFlow production smoke-test checklist

Run this after migrations 001-008 have completed and the Vercel deployment is ready. Use two student accounts and one organizer account; do not use a service-role key in the browser.

## 1. Registration capacity and waitlist
- [ ] Organizer creates/publishes an event with capacity 1, a future date, and a future registration deadline.
- [ ] Student A registers; the database shows one `registered` row and the public seat count is 1/1.
- [ ] Student B registers; if waitlisting is enabled, the result is `waitlisted`, the seat count remains 1/1, and Student B sees a Waitlisted status without an entry QR pass.
- [ ] Student A tries to register again; the duplicate is rejected.
- [ ] Student A cancels; the oldest waitlisted student is promoted to `registered` and receives a notification.
- [ ] Try to register after the deadline or for an ineligible branch; the database rejects it.
- [ ] For concurrency testing, send multiple registration requests at once to an event with one remaining seat; at most one request receives the final confirmed seat.

## 2. QR attendance
- [ ] Organizer starts attendance for an eligible event and tests the phone camera scanner on HTTPS.
- [ ] A valid registration QR is accepted and attendance includes the timestamp and organizer.
- [ ] The same QR is rejected on a second scan; cancelled/invalid passes are rejected.
- [ ] A student cannot call organizer admission or mark their own attendance.

## 3. Certificates
- [ ] Organizer issues certificates only to eligible attendees; issue multiple in one batch.
- [ ] Students can view and download their own PDFs.
- [ ] Public verification shows the correct event/issue details and does not expose unnecessary student fields.
- [ ] A student cannot issue or modify certificates through direct table writes.

## 4. Notifications
- [ ] Successful registration, waitlist placement/promotion, cancellation, and event date/time/venue changes create notifications.
- [ ] Users can only read/update their own notifications.
- [ ] Unread counts change after marking notifications read.

## 5. Organizer analytics
- [ ] Metrics match actual registration, attendance, certificate, and feedback rows.
- [ ] Event and date filters update the charts/tables.
- [ ] Branch distribution reflects confirmed registrations, not waitlisted students.

## 6. Security and end-to-end
- [ ] Student cannot access organizer routes or mutate role/status/email.
- [ ] Organizer cannot modify another organizer's events or grant themselves elevated privileges.
- [ ] RLS is enabled for all user-data tables and unauthorized reads/writes fail.
- [ ] Test mobile and desktop layouts; registration, cancellation, QR attendance, certificates, notifications, and analytics all work after refreshing the page.
- [ ] Confirm Vercel production uses the intended Supabase project and only the public anon key is exposed in `VITE_` variables.

Record any failed step and fix it before calling the deployment production-ready.
