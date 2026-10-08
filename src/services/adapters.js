// Converts database rows into the shapes the CampusFlow pages already use.
// Database values are lower_snake_case ("registration_open"); the UI uses readable labels ("Registration Open").
import {
  DB_TO_LIFECYCLE, DB_TO_CERT_TYPE, DB_TO_AUDIENCE, REJECTION_REASONS, LIFECYCLE_TO_DB, CERT_TYPE_TO_DB, AUDIENCE_TO_DB,
} from '../lib/constants';
import { timeTo12h, timeTo24h, timeAgo } from '../lib/dates';

const cap = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

// A rejection is stored as one text column: "Reason: optional note"
export function parseRejection(text) {
  if (!text) return { reason: null, note: null };
  const idx = text.indexOf(': ');
  if (idx > 0 && REJECTION_REASONS.includes(text.slice(0, idx))) return { reason: text.slice(0, idx), note: text.slice(idx + 2) };
  return { reason: text, note: null };
}
export const joinRejection = (reason, note) => (note && note.trim() ? `${reason}: ${note.trim()}` : reason);

// ---------- Events ----------
export const EVENT_SELECT = '*, category:event_categories(id,name), club:clubs(id,name), department:departments(id,name,code), venue:venues(id,name,capacity)';

// liveStatus comes from the database view event_live_status: the stage the dates dictate RIGHT NOW.
// Registration is checked by the database against the same value, so what is shown here matches what is allowed.
export function adaptEvent(row, seats = 0, liveStatus) {
  const registered = Number(seats) || 0;
  let lifecycle = DB_TO_LIFECYCLE[liveStatus || row.status] || 'Draft';
  const isFull = registered >= row.capacity;
  if (lifecycle === 'Registration Open' && isFull) lifecycle = 'Registration Closed';

  // Public label: Cancelled | Completed | Upcoming (registration not open yet) | Closed | Full | Open
  let publicStatus = 'Open';
  if (lifecycle === 'Cancelled') publicStatus = 'Cancelled';
  else if (lifecycle === 'Completed') publicStatus = 'Completed';
  else if (lifecycle === 'Approved') publicStatus = 'Upcoming';
  else if (lifecycle === 'Ongoing') publicStatus = 'Closed';
  else if (isFull) publicStatus = 'Full';
  else if (lifecycle === 'Registration Closed') publicStatus = 'Closed';

  const rejection = parseRejection(row.rejection_reason);
  const categoryName = row.category?.name || 'Technical';
  return {
    id: row.id,
    legacyId: row.legacy_id,
    title: row.title,
    category: categoryName,
    description: row.description || '',
    date: row.event_date,
    time: timeTo12h(row.start_time),
    endTime: row.end_time ? timeTo12h(row.end_time) : '',
    venue: row.venue?.name || '',
    organizer: row.club?.name || '',
    department: row.department?.name || '',
    departmentCode: row.department?.code || '',
    capacity: row.capacity,
    registered,
    status: publicStatus,
    registrationOpensOn: row.registration_opens_on || '',
    cancellationReason: row.cancellation_reason || '',
    cancelledOn: row.cancelled_at ? row.cancelled_at.slice(0, 10) : undefined,
    storedStatus: row.status,
    registrationDeadline: row.registration_deadline || row.event_date,
    image: categoryName.toLowerCase(),
    schedule: (row.schedule || []).map((s) => [s.time || '', s.activity || '']),
    rules: row.rules || [],
    prizes: row.prizes || [],
    contactName: row.contact_name || '',
    contactEmail: row.contact_email || '',
    contactPhone: row.contact_phone || '',
    posterUrl: row.poster_url || '',
    posterName: row.poster_url ? decodeURIComponent(row.poster_url.split('/').pop() || '').replace(/^\d+-/, '') : '',
    ownerId: row.organizer_id,
    createdBy: row.created_by,
    lifecycle,
    submittedOn: row.submitted_at ? row.submitted_at.slice(0, 10) : undefined,
    decidedOn: row.decided_at ? row.decided_at.slice(0, 10) : undefined,
    rejectionReason: rejection.reason,
    rejectionNote: rejection.note,
    categoryId: row.category_id, clubId: row.club_id, departmentId: row.department_id, venueId: row.venue_id,
  };
}

// UI form values -> events table columns. Names are resolved to ids through the reference lists.
export function eventToRow(f, lookups) {
  const idByName = (list, name) => list.find((x) => x.name === name)?.id ?? null;
  const categoryId = idByName(lookups.categories, f.category);
  if (!categoryId) throw new Error('Choose a category from the list.');
  const venueId = idByName(lookups.venues, f.venue);
  if (!venueId) throw new Error('Choose a venue from the list.');
  return {
    title: f.title,
    description: f.description,
    category_id: categoryId,
    club_id: idByName(lookups.clubs, f.organizer),
    department_id: idByName(lookups.departments, f.department),
    venue_id: venueId,
    event_date: f.date,
    start_time: timeTo24h(f.time),
    end_time: f.endTime ? timeTo24h(f.endTime) : null,
    capacity: Number(f.capacity),
    registration_deadline: f.registrationDeadline || null,
    registration_opens_on: f.registrationOpensOn || null,
    rules: f.rules || [],
    prizes: f.prizes || [],
    schedule: (f.schedule || []).map(([time, activity]) => ({ time, activity })),
    contact_name: f.contactName || null,
    contact_email: f.contactEmail || null,
    contact_phone: f.contactPhone || null,
    ...(f.posterUrl !== undefined ? { poster_url: f.posterUrl || null } : {}),
  };
}

// ---------- People ----------
export function adaptProfile(row) {
  return {
    id: row.id,
    name: row.full_name || row.email || 'Unnamed user',
    email: row.email || '',
    role: row.role,
    roleLabel: row.role === 'organizer' ? 'Event Organiser' : cap(row.role),
    status: cap(row.status),
    department: row.department?.name || '',
    departmentId: row.department_id,
    year: row.year_of_study || '',
    phone: row.phone || '',
    studentNumber: row.student_number || '',
    avatarUrl: row.avatar_url || '',
  };
}

export const withFirstName = (person) => ({
  ...person,
  firstName: (person.name || '').replace(/^(Dr|Prof|Ms|Mr|Mrs)\.?\s+/i, '').split(' ')[0] || 'there',
});

// ---------- Activity ----------
export const adaptCertificate = (row) => ({
  id: row.certificate_number || row.id,
  rowId: row.id,
  eventId: row.event_id,
  studentId: row.student_id,
  type: DB_TO_CERT_TYPE[row.certificate_type] || 'Participation',
  issuedOn: String(row.issued_at).slice(0, 10),
  verificationCode: row.verification_code,
  verified: Boolean(row.verified_at),
  status: row.status,
});

export const adaptAnnouncement = (row) => ({
  id: row.id,
  title: row.title,
  message: row.message,
  audience: DB_TO_AUDIENCE[row.audience] || row.audience,
  eventId: row.event_id,
  authorId: row.created_by,
  date: String(row.published_at || row.created_at).slice(0, 10),
  status: cap(row.status),
});

export function adaptNotification(row, role) {
  const eventLink = row.related_event_id ? `/events/${row.related_event_id}` : null;
  let link = eventLink;
  if (row.type === 'certificate') link = '/student/certificates';
  if (row.type === 'approval') link = '/organizer/events';
  if (row.type === 'attendance') link = '/student/attendance';
  if (row.type === 'account') link = `/${role}/profile`;
  return {
    id: row.id, title: row.title, text: row.message, time: timeAgo(row.created_at), unread: !row.is_read, type: row.type, link, eventId: row.related_event_id,
  };
}

export { LIFECYCLE_TO_DB, CERT_TYPE_TO_DB, AUDIENCE_TO_DB };
