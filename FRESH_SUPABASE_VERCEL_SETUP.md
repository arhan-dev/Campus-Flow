# Fresh Supabase + Vercel setup (CampusFlow)

> **Destructive action warning:** deleting your existing Supabase project permanently deletes its database, Auth users, uploaded Storage objects, and project configuration. Keep the old project until the new one works end-to-end and you have exported anything you need. The SQL migrations create a fresh schema; they do not transfer existing users or data.

## Create the new Supabase project

1. Create a new project in the Supabase dashboard and save the database password securely.
2. Open **SQL Editor**. Run each migration below in its own query, in this exact order. Wait for success before proceeding.
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_section7.sql`
   - `supabase/migrations/003_section8_hardening.sql`
   - `supabase/migrations/004_event_organizer_model.sql`
   - `supabase/migrations/005_lock_profile_roles.sql`
   - `supabase/migrations/006_event_branch_and_entry_qr.sql`
   - `supabase/migrations/007_organizer_branch_management.sql`
   - `supabase/migrations/008_production_event_workflows.sql`
3. If you want sample departments/categories/venues, review and run `supabase/seed.sql`. It does not create real user accounts.
4. Run `supabase/tests/final_model_tests.sql`. Then follow `supabase/tests/production_smoke_test.md`. Do not deploy to real users until registration, waitlist, organizer permissions, and attendance pass with test accounts.
5. Create your first student through Supabase Auth sign-up. To create an organizer, sign up that account first, then use `supabase/promote-user.sql` from SQL Editor after replacing `organizer@example.com` with the exact email. Keep this operation restricted to a trusted project owner.

## Connect the frontend to Supabase

1. In Supabase **Project Settings → API** (or the API keys page), copy the project URL and the **publishable/anon public key**. Never use a `service_role` or secret key in frontend code.
2. In the repository root, create `.env.local` based on `.env.example` and set:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
   VITE_INSTITUTION_NAME=CampusFlow
   ```

3. Install dependencies and test locally with `npm ci` and `npm run build`.

## Connect to Vercel

1. Push this project to the GitHub repository you want to deploy.
2. In Vercel, import that repository. Framework preset should be **Vite**; build command `npm run build`; output directory `dist`.
3. In Vercel **Project Settings → Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Production (and Preview/Development if required). Add `VITE_INSTITUTION_NAME` optionally.
4. Redeploy after setting the variables; Vite embeds these values at build time.
5. In Supabase **Authentication → URL Configuration**, set the Site URL to your deployed Vercel domain and add the exact Vercel production URL plus any required preview URLs to Redirect URLs. Configure email confirmation/SMTP according to your deployment needs.
6. Test sign-up/sign-in, student registration and cancellation, waitlist promotion, organizer event management, QR admission, and RLS boundaries on the deployed URL.

## Important

- Run migrations 001–008 only on a **brand-new empty database** in the listed order. Do not paste all files together unless you have deliberately checked statement boundaries and error handling.
- If a migration errors, stop there, fix that error, and restart on a clean project if earlier statements partially committed.
- The frontend public key is expected to be public; database security must come from RLS and server-side functions. Never commit `.env.local`.
