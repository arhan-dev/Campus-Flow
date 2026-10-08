-- Promote an existing Supabase Auth user to Event Organiser.
-- Replace the email below, then run this in Supabase SQL Editor.
-- The role is deliberately not exposed through public sign-up.

update public.profiles
set role = 'organizer',
    status = 'active'
where email = 'organizer@example.com';

-- Verify the result:
select id, email, full_name, role, status
from public.profiles
where email = 'organizer@example.com';
