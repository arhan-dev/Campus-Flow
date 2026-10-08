// Fixed UI vocabulary shared by the pages. Event data itself comes from Supabase.

// ---------- Event lifecycle (labels shown in the UI <-> values stored in events.status) ----------
export const LIFECYCLE = [
  'Draft', 'Pending Approval', 'Approved', 'Registration Open', 'Registration Closed', 'Ongoing', 'Completed', 'Rejected', 'Cancelled',
];
export const LIFECYCLE_TO_DB = {
  Draft: 'draft',
  'Pending Approval': 'pending_approval',
  Approved: 'approved',
  'Registration Open': 'registration_open',
  'Registration Closed': 'registration_closed',
  Ongoing: 'ongoing',
  Completed: 'completed',
  Rejected: 'rejected',
  Cancelled: 'cancelled',
};
export const DB_TO_LIFECYCLE = Object.fromEntries(Object.entries(LIFECYCLE_TO_DB).map(([label, db]) => [db, label]));
// Statuses that are visible to everyone (must match is_published_status() in the SQL migration)
export const PUBLISHED_DB_STATUSES = ['approved', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled'];

// Badge variant for each lifecycle stage (styles live in manage.css and globals.css)
export const lifecycleVariant = {
  Draft: 'draft',
  'Pending Approval': 'pending',
  Approved: 'approved',
  'Registration Open': 'open',
  'Registration Closed': 'closed',
  Ongoing: 'ongoing',
  Completed: 'completed',
  Rejected: 'rejected',
  Cancelled: 'cancelled',
};
// Stages in which an event holds its venue and date (used for the venue clash warning)
export const ACTIVE_LIFECYCLE = ['Pending Approval', 'Approved', 'Registration Open', 'Registration Closed', 'Ongoing'];
// Stages that count as "upcoming" for organisers
export const UPCOMING_LIFECYCLE = ['Approved', 'Registration Open', 'Registration Closed', 'Ongoing'];

export const REJECTION_REASONS = ['Incomplete event details', 'Venue conflict', 'Capacity issue', 'Requires modification'];

// ---------- Certificates ----------
export const CERTIFICATE_TYPES = ['Participation', 'Winner', 'Runner-up', 'Volunteer'];
export const CERT_TYPE_TO_DB = { Participation: 'participation', Winner: 'winner', 'Runner-up': 'runner_up', Volunteer: 'volunteer' };
export const DB_TO_CERT_TYPE = Object.fromEntries(Object.entries(CERT_TYPE_TO_DB).map(([label, db]) => [db, label]));

// ---------- Announcements ----------
export const AUDIENCES = ['Registered Participants', 'Event Participants', 'Department', 'All Students'];
export const AUDIENCE_TO_DB = {
  'Registered Participants': 'registered_participants',
  'Event Participants': 'event_participants',
  Department: 'department',
  'All Students': 'all_students',
};
export const DB_TO_AUDIENCE = Object.fromEntries(Object.entries(AUDIENCE_TO_DB).map(([label, db]) => [db, label]));
export const AUDIENCE_HINTS = {
  'Registered Participants': 'Everyone who registered for the selected event.',
  'Event Participants': 'Only students marked present at the selected event.',
  Department: "Students of the event's department.",
  'All Students': 'Every student account.',
};

export const RATING_LABELS = { overall: 'Overall', organization: 'Organization', content: 'Content', speaker: 'Speaker', venue: 'Venue' };
export const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

// ---------- Event discovery ----------
export const STATUS_LIST = ['Open', 'Full', 'Completed', 'Cancelled'];
export const SORT_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming first' },
  { value: 'date-asc', label: 'Date: earliest first' },
  { value: 'date-desc', label: 'Date: latest first' },
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' },
];

// ---------- Participation points ----------
// These are the rules the database applies (see the attendance and certificate triggers in the SQL migration).
export const POINT_RULES = [
  { activity: 'Participation', points: 10 },
  { activity: 'Workshop', points: 15 },
  { activity: 'Hackathon', points: 30 },
  { activity: 'Volunteer', points: 25 },
  { activity: 'Winner', points: 50 },
  { activity: 'Runner-up', points: 30 },
];

export const ROLES = ['student', 'organizer'];
export const roleHome = (role) => `/${ROLES.includes(role) ? role : 'student'}/dashboard`;

// ---------- Section 7 ----------
// Name printed on certificates and shown on the verification page. Optional: set VITE_INSTITUTION_NAME in .env.local.
export const INSTITUTION_NAME = (import.meta.env?.VITE_INSTITUTION_NAME || '').trim() || 'CampusFlow';

export const CANCEL_REASON_MAX = 300;
export const ATTENDANCE_SESSION_MINUTES = [15, 30, 60, 120, 240];

// Gallery uploads (the storage bucket enforces the same limits on the server)
export const GALLERY_MAX_BYTES = 5 * 1024 * 1024;
export const GALLERY_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
