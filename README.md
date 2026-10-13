# CampusFlow

**One platform for every college event.**

CampusFlow is a responsive college event-management web application built with React and Vite, with Supabase providing authentication, PostgreSQL data storage, Row Level Security (RLS), database functions/triggers, and storage.

It connects students with event organisers through a single event lifecycle:

**Discover → Register → Attend → Earn Certificates → Share Feedback**

> **Project status:** This README describes the code and setup included in this repository. The presence of a feature or test script does not by itself mean it has been verified in a live Supabase project. Run the setup and test steps below before treating a deployment as production-ready.

---

## Contents

- [Features](#features)
- [Roles and access model](#roles-and-access-model)
- [Technology stack](#technology-stack)
- [Project structure](#project-structure)
- [Requirements](#requirements)
- [Run locally](#run-locally)
- [Configure Supabase](#configure-supabase)
- [Database migrations and seed data](#database-migrations-and-seed-data)
- [Promote an organiser account](#promote-an-organiser-account)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security notes](#security-notes)
- [Troubleshooting](#troubleshooting)

---

## Features

### Public experience
- Home page with event discovery sections
- Browse and search events
- Browse event categories and clubs
- Event detail pages and event galleries
- Public certificate verification page
- Sign in, sign up, and password-reset flows
- Responsive layouts for mobile and desktop

### Student
- Student account and profile
- Browse event listings and details
- Register for events and cancel eligible registrations
- My Events and event calendar
- Attendance and check-in experience
- Digital certificates and certificate verification
- Participation points
- Notifications
- Event feedback

### Event Organiser
- Organiser dashboard and analytics
- Create, publish, edit, and cancel events
- Manage event registrations and participant lists
- Manage attendance, including QR-based check-in sessions
- Manage certificates
- Manage announcements
- Manage clubs and event gallery content
- Review feedback
- Manage organiser profile

### Data and workflow safeguards
- Supabase Authentication
- PostgreSQL schema, constraints, indexes, functions, and triggers
- Row Level Security policies
- Duplicate-registration and event-capacity safeguards
- Event lifecycle and registration-window checks
- Role changes restricted from normal user profile updates
- Realtime synchronization hooks for supported data
- Supabase Storage integration

Actual behaviour depends on applying the included migrations in order and configuring the matching Supabase project.

---

## Roles and access model

The current application model uses **two product roles**:

| Role | Purpose |
|---|---|
| `student` | Discovers events, registers, checks attendance, receives certificates and notifications, and submits feedback. |
| `organizer` | Manages events and the wider event ecosystem, including registrations, attendance, certificates, clubs, announcements, gallery content, and analytics. |

New public sign-ups are intended to become students. Organiser access is granted intentionally through the SQL procedure in [`supabase/promote-user.sql`](supabase/promote-user.sql).

The repository may retain legacy database helper names for compatibility with earlier migrations. The current product UI does not provide separate Faculty, Club Manager, or System Administrator roles.

---

## Technology stack

**Frontend**
- React 18
- Vite 5
- JavaScript / JSX
- React Router
- Lucide React icons
- CSS

**Backend**
- Supabase Auth
- Supabase PostgreSQL
- Row Level Security (RLS)
- PostgreSQL functions and triggers
- Supabase Storage
- Realtime subscriptions where configured

**Deployment**
- Vercel

---

## Project structure

```text
Campus-Flow-main/
├── public/                   # Static assets
├── scripts/                  # Project helper scripts
├── src/
│   ├── components/           # Shared UI components
│   ├── context/              # Authentication and app data contexts
│   ├── data/                 # Category metadata and selectors
│   ├── hooks/                # Reusable data and UI hooks
│   ├── layouts/              # Public, student, and organiser layouts
│   ├── lib/                  # Supabase client, date, PDF and utility code
│   ├── pages/                # Public, student, organiser, and shared pages
│   ├── services/             # Supabase-facing service functions
│   └── styles/               # Global, component, dashboard, and mobile CSS
├── supabase/
│   ├── migrations/           # Ordered database migrations
│   ├── tests/                # SQL security/workflow test scripts
│   ├── seed-data/            # Seed-data helper files
│   ├── seed.sql              # Initial reference/demo data
│   └── promote-user.sql      # Intentional organiser promotion
├── .env.example
├── index.html
├── package.json
├── package-lock.json
├── vercel.json
└── vite.config.js
```

---

## Requirements

Install the following before running the project:

- Node.js (use a current LTS release)
- npm
- A Supabase project for backend-connected functionality

Check your installed versions:

```bash
node --version
npm --version
```

---

## Run locally

1. Clone the repository:

   ```bash
   git clone https://github.com/arhan-dev/Campus-Flow.git
   cd Campus-Flow
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a local environment file:

   ```bash
   cp .env.example .env.local
   ```

   On Windows, create `.env.local` manually by copying `.env.example`.

4. Add your Supabase project values to `.env.local`:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
   VITE_INSTITUTION_NAME=CampusFlow
   ```

   Replace the example values with the URL and **public anon/publishable key** from your Supabase project. Do not put a service-role key in a frontend environment file.

5. Start the development server:

   ```bash
   npm run dev
   ```

   Open the local URL printed by Vite in your browser.

### Available npm scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the production bundle |
| `npm run preview` | Preview the production build locally |
| `npm run seed:generate` | Run the included seed-data generator |

---

## Configure Supabase

1. Create a Supabase project.
2. Open **Project Settings → API** (or the current API keys page in the dashboard).
3. Copy the project URL and public anon/publishable key into `.env.local`.
4. Open the Supabase **SQL Editor**.
5. Apply the migration files in the exact order shown below.
6. Apply the seed data after the initial schema is installed.
7. Configure Auth redirect URLs for your local development URL and deployed domain.
8. Confirm the configured Storage buckets and policies match the migration definitions.
9. Create a test student account and verify the student workflow before promoting any account to organiser.

Do not expose database passwords, access tokens, or the Supabase `service_role` key in client-side code or commit them to Git.

---

## Database migrations and seed data

Run these files **in order** in the Supabase SQL Editor, unless you use a migration runner that tracks and applies them in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/seed.sql`
3. `supabase/migrations/002_section7.sql`
4. `supabase/migrations/003_section8_hardening.sql`
5. `supabase/migrations/004_event_organizer_model.sql`

These scripts are intended for a fresh project or for a database whose current migration state has been checked. Do not blindly rerun schema migrations against a live database: inspect the existing schema and backups first.

The migrations cover the initial schema and security policies, event lifecycle and QR attendance functionality, a security hardening change, and the current student/organiser role model.

### Campus time zone

The event lifecycle migration uses a configured campus time zone. Review the `campus_timezone` value in `public.app_settings` and change it to the institution's intended IANA time-zone name if necessary. Event start times, deadlines, and attendance windows should be verified against that setting.

---

## Promote an organiser account

Public registration is intended for students. To grant organiser access:

1. Sign up through the application with the intended account.
2. Confirm the account exists in Supabase Authentication.
3. Open `supabase/promote-user.sql`.
4. Replace the example email address in the script with the exact email of the intended account.
5. Review the SQL carefully, then run it in the Supabase SQL Editor.
6. Sign out and sign in again so the application refreshes the user's role/session state.
7. Verify the organiser dashboard and permissions.

Only grant organiser privileges to trusted accounts. Do not add a role selector to public sign-up as a substitute for this controlled process.

---

## Testing

The repository includes SQL test scripts:

- `supabase/tests/rls_tests.sql`
- `supabase/tests/section7_tests.sql`

Review each script's comments before running it. The tests exercise database permissions and workflows using test identities and transaction-based assertions. Run them only against a **dedicated development/test Supabase project**, not a production database. Confirm the script's rollback and cleanup behaviour before execution.

### Recommended verification checklist

- [ ] `npm install` completes successfully.
- [ ] `npm run build` completes without errors.
- [ ] The app displays its setup state when Supabase environment variables are missing.
- [ ] Sign-up, sign-in, sign-out, and password reset work.
- [ ] A new account receives the student role.
- [ ] Students can browse published events and cannot access organiser-only actions.
- [ ] Valid registration works; duplicate, full-event, closed-registration, and invalid registrations are rejected.
- [ ] Registration and profile data persist after refreshing or signing in again.
- [ ] An organiser can create, edit, publish, and cancel events.
- [ ] Attendance/QR workflows enforce the intended event, time window, and permissions.
- [ ] Certificates and public verification behave as expected.
- [ ] Notifications, announcements, gallery, feedback, and points behave correctly where enabled.
- [ ] RLS tests pass in a dedicated test project.
- [ ] Mobile navigation, event cards, forms, dialogs, and dashboards are checked on narrow screens.
- [ ] Vercel production build and runtime logs show no errors.

A test should be marked **passed only after it has actually been run**. A source file or SQL test existing in the repository is not proof that the deployed feature works.

---

## Deployment

The project can be deployed to Vercel:

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Use the standard Vite build settings:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Add the following environment variables in Vercel's project settings:

   ```text
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   VITE_INSTITUTION_NAME
   ```

5. Redeploy after changing environment variables.
6. Configure Supabase Auth's allowed redirect URLs to include the deployed domain.
7. Test the deployed app after the build completes.

The repository includes `vercel.json`; review its routing behaviour if direct navigation to nested React Router routes returns a 404.

---

## Security notes

- Keep `.env.local` out of Git; `.gitignore` should exclude local secrets.
- Only the public Supabase anon/publishable key belongs in frontend configuration.
- Never expose the Supabase `service_role` key or database credentials.
- RLS must remain enabled and correctly configured for user-owned and role-restricted data.
- Do not trust frontend role checks alone; verify permissions in PostgreSQL/RLS.
- Test organiser promotion and sensitive workflows using separate student and organiser accounts.
- Use a separate Supabase project for security tests and demo seed data.
- Review Storage policies, Auth redirect settings, and database policies before production use.

---

## Troubleshooting

**The app shows a Supabase setup screen**
- Check that `.env.local` exists at the project root.
- Confirm the variable names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Restart `npm run dev` after editing environment variables.

**Sign-in succeeds but the expected dashboard does not appear**
- Check the user's role in `public.profiles`.
- Confirm the correct migrations were applied.
- Sign out and sign in again to refresh session/role state.

**Data is missing or requests return permission errors**
- Check the browser console and network requests.
- Review RLS policies and the authenticated user's role.
- Confirm migrations were applied in order and seed data exists where required.

**Nested routes fail after deployment**
- Check the Vercel rewrite/fallback configuration in `vercel.json`.
- Confirm the Vite build succeeds locally with `npm run build`.

**A QR or registration action is rejected**
- Check the event's current lifecycle stage, registration deadline, capacity, event date, and the signed-in user's role.
- Review the matching database function/trigger and its returned error message.

---

## Project goal

CampusFlow aims to replace scattered event notices, registration forms, spreadsheets, manual attendance, and separate certificate records with one connected campus event platform.

**One platform for every college event.**
