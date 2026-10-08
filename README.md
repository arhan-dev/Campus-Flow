# CampusFlow

### One platform for every college event.

CampusFlow is a college event management system that connects students, students and event organisers on one platform.

It manages the complete event lifecycle:

**Create → Publish → Register → Attend → Certify → Analyze**

---

## Features

### Student
- Student signup and login
- Browse and search events
- Filter events by category and status
- View event details
- Register for events
- Cancel eligible registrations
- My Events
- Attendance tracking
- Digital certificates
- Participation points
- Notifications
- Event feedback
- Student profile

### Event Organiser
- Faculty login
- Create and edit events
- Submit events for admin approval
- Manage event registrations
- View participants
- Record attendance
- Manage certificates
- Publish announcements
- View feedback
- Event analytics
- Faculty profile

### Administrator
- Admin login
- Review and approve events
- Reject events with a reason
- Manage users
- Manage departments
- Manage clubs
- Manage venues
- View registrations
- Manage attendance
- Manage certificates
- Publish announcements
- Campus-wide analytics
- Admin profile

---

## Core Workflow

```text
Faculty creates event
        ↓
Admin reviews and approves
        ↓
Event is published
        ↓
Student discovers event
        ↓
Student registers
        ↓
Faculty manages participants
        ↓
Attendance is recorded
        ↓
Certificates / participation
        ↓
Feedback and analytics


---

Backend & Security

CampusFlow uses Supabase as its backend.

Supabase Authentication

PostgreSQL database

Row Level Security (RLS)

Database constraints and triggers

Supabase Storage

Persistent application data

Role-based access control


User roles:

Student
Faculty
Admin

Important permissions are enforced at the database level using RLS instead of relying only on frontend checks.


---

Tech Stack

Frontend

React

Vite

JavaScript / JSX

React Router

HTML / CSS

Lucide React

Recharts


Backend

Supabase

PostgreSQL

Supabase Auth

Row Level Security

Supabase Storage


Deployment

Vercel



---

Main Database Tables

profiles
departments
clubs
venues
events
event_categories
event_registrations
attendance
certificates
announcements
feedback
participation_points
notifications
event_gallery


---

Project Structure

CampusFlow/
├── public/
├── src/
│   ├── components/
│   ├── context/
│   ├── layouts/
│   ├── lib/
│   ├── pages/
│   │   ├── admin/
│   │   ├── faculty/
│   │   ├── home/
│   │   ├── manage/
│   │   └── student/
│   ├── services/
│   └── styles/
├── supabase/
│   ├── migrations/
│   ├── tests/
│   ├── seed.sql
│   └── promote-user.sql
├── package.json
└── README.md


---

Getting Started

Clone the repository

git clone https://github.com/arhan-dev/Campus-Flow-.git
cd Campus-Flow-

Install dependencies

npm install

Create .env.local

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_INSTITUTION_NAME=CampusFlow

Run locally

npm run dev

Production build

npm run build


---

Deployment

CampusFlow is deployed using Vercel.

Required environment variables:

VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_INSTITUTION_NAME


---

Current Status

The main CampusFlow workflow is implemented and connected to Supabase.

The current version includes:

Real authentication

Role-based dashboards

Real event creation and approval

Real event registration

Registration cancellation

Real attendance management

Certificate records

Notifications

Announcements

Feedback

Participation points

User management

Clubs and departments

Venue management

Faculty analytics

Admin analytics

Supabase database and RLS

Responsive mobile and desktop UI

Vercel deployment



---

Project Goal

CampusFlow aims to replace scattered college event processes such as notices, forms, spreadsheets, manual attendance and separate certificate records with one connected platform.

One platform for every college event.

## Current product model

CampusFlow now uses two application roles:

- **Student** — discovers events, registers, attends, receives certificates, notifications and feedback requests.
- **Event Organiser** — creates and publishes events, edits/cancels events, manages registrations and attendance, manages clubs, certificates, announcements, gallery, feedback and analytics.

There is no Faculty, Club Manager or System Administrator role in the product UI. New public sign-ups are always students. Event Organiser accounts are promoted intentionally through `supabase/promote-user.sql`.

The interface uses the Aurora Campus visual system: dark ambient background, selective glass surfaces, Manrope/Plus Jakarta Sans typography, responsive layouts and subtle interaction states.
