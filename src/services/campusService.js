import { supabase } from '../lib/supabase';
import { unwrap } from '../lib/errors';
import { EVENT_SELECT } from './adapters';
import { CERT_TYPE_TO_DB, AUDIENCE_TO_DB, ROLES } from '../lib/constants';

// Data for the student-facing and organiser areas. Row level security decides what each role receives:
// organisers get the campus event data and the students registered for them.
export async function fetchCampusRaw(userId) {
  const [events, seats, live, registrations, profiles, attendance, certificates, feedback, announcements, notifications, departments, clubs, venues] = await Promise.all([
    supabase.from('events').select(EVENT_SELECT).order('event_date'),
    supabase.from('event_seat_counts').select('event_id, registered_count'),
    supabase.from('event_live_status').select('event_id, live_status'),
    supabase.from('event_registrations').select('id, event_id, student_id, status, registered_at'),
    supabase.from('profiles').select('id, full_name, email, role, status, department_id, year_of_study, phone, student_number, avatar_url, department:departments(id,name)'),
    supabase.from('attendance').select('event_id, student_id, status, method, marked_at'),
    supabase.from('certificates').select('*'),
    supabase.from('feedback').select('*'),
    supabase.from('announcements').select('*').order('created_at', { ascending: false }),
    supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    supabase.from('departments').select('id, name, code, is_active').order('name'),
    supabase.from('clubs').select('id, name, category, description, department_id, is_active').order('name'),
    supabase.from('venues').select('id, name, capacity, status').order('name'),
  ]);
  return {
    events: unwrap(events, 'Could not load events.'),
    seats: unwrap(seats, 'Could not load seat counts.'),
    live: unwrap(live, 'Could not load event status.'),
    registrations: unwrap(registrations, 'Could not load registrations.'),
    profiles: unwrap(profiles, 'Could not load people.'),
    attendance: unwrap(attendance, 'Could not load attendance.'),
    certificates: unwrap(certificates, 'Could not load certificates.'),
    feedback: unwrap(feedback, 'Could not load feedback.'),
    announcements: unwrap(announcements, 'Could not load announcements.'),
    notifications: unwrap(notifications, 'Could not load notifications.'),
    departments: unwrap(departments, 'Could not load departments.'),
    clubs: unwrap(clubs, 'Could not load clubs.'),
    venues: unwrap(venues, 'Could not load venues.'),
  };
}

// ---------- Attendance ----------
// marks: { [studentId]: 'Present' | 'Absent' }. One row per student and event (unique constraint), so this is an upsert.
export async function saveAttendance(eventId, marks) {
  const rows = Object.entries(marks).map(([studentId, status]) => ({ event_id: eventId, student_id: studentId, status: status.toLowerCase() }));
  if (!rows.length) return;
  unwrap(await supabase.from('attendance').upsert(rows, { onConflict: 'event_id,student_id' }), 'Could not save attendance.');
}

// ---------- Certificates ----------
// items: [{ studentId, eventId, type }]. The database refuses students who were not marked present.
export async function issueCertificates(items) {
  const rows = items.map((i) => ({ event_id: i.eventId, student_id: i.studentId, certificate_type: CERT_TYPE_TO_DB[i.type] }));
  const data = unwrap(await supabase.from('certificates').insert(rows).select('certificate_number, verification_code, student_id'), 'Could not issue the certificates.');
  return data.map((c) => ({ number: c.certificate_number, code: c.verification_code, studentId: c.student_id }));
}

export async function verifyCertificate(rowId) {
  unwrap(await supabase.from('certificates').update({ verified_at: new Date().toISOString() }).eq('id', rowId), 'Could not mark the certificate as verified.');
}

// ---------- Announcements ----------
export async function createAnnouncement({ title, message, audience, eventId, status }, authorId) {
  unwrap(await supabase.from('announcements').insert({
    title, message, event_id: eventId || null, audience: AUDIENCE_TO_DB[audience], status: status === 'Draft' ? 'draft' : 'published', created_by: authorId,
  }), 'Could not create the announcement.');
}

export async function setAnnouncementStatus(id, status) {
  unwrap(await supabase.from('announcements').update({ status: status.toLowerCase() }).eq('id', id), 'Could not update the announcement.');
}

export async function deleteAnnouncement(id) {
  unwrap(await supabase.from('announcements').delete().eq('id', id), 'Could not delete the announcement.');
}

// ---------- Admin: people and reference data (organiser-only policies in the database) ----------
// The database refuses role/status changes from anyone who is not an admin, an admin changing their own account,
// and the removal of the last active admin (guard_profile_write). Every change is logged in profile_changes.
export async function setUserStatus(id, status) {
  unwrap(await supabase.from('profiles').update({ status: status.toLowerCase() }).eq('id', id), 'Could not change the account status.');
}
export async function setUserRole(id, role) {
  if (!ROLES.includes(role)) throw new Error('Choose student or organizer.');
  unwrap(await supabase.from('profiles').update({ role }).eq('id', id), 'Could not change the role.');
}
export async function setDepartmentActive(id, active) {
  unwrap(await supabase.from('departments').update({ is_active: active }).eq('id', id), 'Could not update the department.');
}

export async function createClub({ name, category, description, departmentId }) {
  unwrap(await supabase.from('clubs').insert({
    name: name.trim(),
    category: category.trim() || null,
    description: description?.trim() || null,
    department_id: departmentId || null,
    is_active: true,
  }), 'Could not create the club.');
}

export async function updateClub(id, { name, category, description, departmentId }) {
  unwrap(await supabase.from('clubs').update({
    name: name.trim(),
    category: category.trim() || null,
    description: description?.trim() || null,
    department_id: departmentId || null,
  }).eq('id', id), 'Could not update the club.');
}

export async function setClubActive(id, active) {
  unwrap(await supabase.from('clubs').update({ is_active: active }).eq('id', id), 'Could not update the club.');
}
export async function setVenueStatus(id, status) {
  unwrap(await supabase.from('venues').update({ status: status.toLowerCase() }).eq('id', id), 'Could not update the venue.');
}
