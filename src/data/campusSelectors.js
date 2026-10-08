// Turns the rows loaded from Supabase into the shapes the faculty, admin and student pages use.
// Pure functions only: no network calls and no browser state, so every page reads the same numbers.
import {
  ACTIVE_LIFECYCLE, UPCOMING_LIFECYCLE,
} from '../lib/constants';
import { formatDate, todayISO } from '../lib/dates';
import { adaptEvent, adaptProfile, adaptCertificate, adaptAnnouncement, adaptNotification, withFirstName } from '../services/adapters';

const average = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const round1 = (n) => Math.round(n * 10) / 10;
const REG_STATUS = { registered: 'Confirmed', waitlisted: 'Waitlisted', cancelled: 'Cancelled' };

// Averages feedback rows (anonymous) into { eventId, responses, ratings, comments }
function summarizeFeedback(rows) {
  const keys = { overall: 'overall_rating', organization: 'organization_rating', content: 'content_rating', speaker: 'speaker_rating', venue: 'venue_rating' };
  const ratings = {};
  Object.entries(keys).forEach(([key, column]) => {
    const values = rows.map((r) => r[column]).filter((v) => typeof v === 'number');
    ratings[key] = values.length ? round1(average(values)) : null;
  });
  return { responses: rows.length, ratings, comments: rows.map((r) => r.comment).filter(Boolean) };
}

// ============================ Faculty and admin ============================
export function buildCampusData(raw, profile) {
  const empty = !raw;
  const r = raw || {
    events: [], seats: [], live: [], registrations: [], profiles: [], attendance: [], certificates: [], feedback: [], announcements: [], notifications: [], departments: [], clubs: [], venues: [],
  };
  const role = profile?.role || 'organizer';
  const today = todayISO();

  // ----- Events -----
  const seatMap = new Map(r.seats.map((s) => [s.event_id, s.registered_count]));
  const liveMap = new Map((r.live || []).map((l) => [l.event_id, l.live_status]));
  const allEvents = r.events
    .map((row) => adaptEvent(row, seatMap.get(row.id) || 0, liveMap.get(row.id)))
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  const eventById = new Map(allEvents.map((e) => [e.id, e]));
  const getEvent = (id) => eventById.get(id);
  const myEvents = role === 'organizer' ? allEvents : allEvents.filter((e) => e.ownerId === profile?.id);

  // ----- Venue clashes: same venue on the same day, only counting events that hold their slot -----
  const slotGroups = {};
  allEvents.filter((e) => ACTIVE_LIFECYCLE.includes(e.lifecycle)).forEach((e) => {
    const key = `${e.date}|${e.venue}`;
    (slotGroups[key] = slotGroups[key] || []).push(e);
  });
  const conflicts = Object.values(slotGroups).filter((g) => g.length > 1).map((g) => ({ date: g[0].date, venue: g[0].venue, events: g }));
  const conflictIds = new Map();
  conflicts.forEach((c) => c.events.forEach((e) => conflictIds.set(e.id, c.events.filter((o) => o.id !== e.id))));
  const conflictsFor = (event) => conflictIds.get(event.id) || [];

  // ----- People -----
  const people = r.profiles.map(adaptProfile);
  const students = people.filter((p) => p.role === 'student');
  const studentById = Object.fromEntries(students.map((s) => [s.id, s]));
  const peopleById = Object.fromEntries(people.map((p) => [p.id, p]));

  // ----- Attendance -----
  const attendanceMap = new Map(r.attendance.map((a) => [`${a.event_id}:${a.student_id}`, a.status === 'present' ? 'Present' : 'Absent']));
  const attendanceMethodMap = new Map(r.attendance.map((a) => [`${a.event_id}:${a.student_id}`, a.method === 'qr' ? 'QR check-in' : 'Marked by organizer']));
  const attendanceFor = (eventId, studentId) => attendanceMap.get(`${eventId}:${studentId}`) ?? 'Pending';
  const attendanceMethodFor = (eventId, studentId) => attendanceMethodMap.get(`${eventId}:${studentId}`) ?? '';

  // ----- Certificates -----
  const certificateRows = r.certificates
    .filter((c) => c.status === 'issued')
    .map(adaptCertificate)
    .map((c) => ({ ...c, student: studentById[c.studentId], event: eventById.get(c.eventId) }))
    .filter((c) => c.student && c.event);
  const certByKey = new Map(certificateRows.map((c) => [`${c.eventId}:${c.studentId}`, c]));

  // ----- Registrations (with attendance and certificate state) -----
  const registrations = r.registrations
    .map((reg) => {
      const event = eventById.get(reg.event_id);
      const student = studentById[reg.student_id];
      if (!event || !student) return null;
      const status = REG_STATUS[reg.status] || reg.status;
      const confirmed = status === 'Confirmed';
      const key = `${reg.event_id}:${reg.student_id}`;
      const cert = certByKey.get(key);
      const attendance = confirmed ? attendanceFor(reg.event_id, reg.student_id) : 'N/A';
      let certificate = 'N/A';
      if (cert) certificate = 'Issued';
      else if (confirmed && attendance === 'Present') certificate = 'Pending';
      return {
        key, eventId: reg.event_id, studentId: reg.student_id, registeredOn: String(reg.registered_at).slice(0, 10), status,
        event, student, attendance, certificate, certificateType: cert?.type,
        attendanceMethod: confirmed ? attendanceMethodFor(reg.event_id, reg.student_id) : '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.registeredOn.localeCompare(a.registeredOn));

  const rosterFor = (eventId) => registrations.filter((x) => x.eventId === eventId && x.status === 'Confirmed');
  const attendanceSummary = (eventId) => {
    const roster = rosterFor(eventId);
    const present = roster.filter((x) => x.attendance === 'Present').length;
    const absent = roster.filter((x) => x.attendance === 'Absent').length;
    return { total: roster.length, present, absent, unmarked: roster.length - present - absent, rate: pct(present, roster.length), marked: present + absent };
  };
  const summarize = (list) => {
    const rows = list.filter((x) => x.status === 'Confirmed');
    const present = rows.filter((x) => x.attendance === 'Present').length;
    const absent = rows.filter((x) => x.attendance === 'Absent').length;
    return { total: rows.length, present, absent, marked: present + absent, rate: pct(present, present + absent) };
  };
  const pendingCertificates = registrations.filter((x) => x.certificate === 'Pending');

  // ----- Feedback (anonymous summaries) -----
  const feedbackByEvent = {};
  r.feedback.forEach((f) => { (feedbackByEvent[f.event_id] = feedbackByEvent[f.event_id] || []).push(f); });
  const feedback = Object.entries(feedbackByEvent)
    .map(([eventId, rows]) => ({ eventId, event: eventById.get(eventId), ...summarizeFeedback(rows) }))
    .filter((f) => f.event)
    .sort((a, b) => b.event.date.localeCompare(a.event.date));

  // ----- Announcements -----
  const announcements = r.announcements.map(adaptAnnouncement).map((a) => ({
    ...a,
    authorRole: a.authorId === profile?.id ? role : (peopleById[a.authorId]?.role || 'organizer'),
    event: a.eventId ? eventById.get(a.eventId) || null : null,
  }));

  // ----- Users, departments, clubs, venues -----
  const users = people.map((p) => ({ id: p.id, name: p.name, role: p.roleLabel, department: p.department, status: p.status, year: p.year, email: p.email }));
  const visible = (e) => e.lifecycle !== 'Draft' && e.lifecycle !== 'Rejected';
  const departments = r.departments.map((d) => ({
    id: d.id, name: d.name, code: d.code, status: d.is_active ? 'Active' : 'Inactive',
    eventCount: allEvents.filter((e) => e.departmentId === d.id && visible(e)).length,
  }));
  const clubs = r.clubs.map((c) => ({
    id: c.id, name: c.name, category: c.category || '-', description: c.description || '', departmentId: c.department_id || '', status: c.is_active ? 'Active' : 'Inactive',
    eventCount: allEvents.filter((e) => e.clubId === c.id && visible(e)).length,
  }));
  const venues = r.venues.map((v) => {
    const list = allEvents.filter((e) => e.venueId === v.id);
    const upcoming = list.filter((e) => e.date >= today && ACTIVE_LIFECYCLE.includes(e.lifecycle));
    return {
      id: v.id, name: v.name,
      capacity: v.capacity ?? (list.length ? Math.max(...list.map((e) => Number(e.capacity) || 0)) : 0),
      upcomingCount: upcoming.length,
      hasConflict: upcoming.some((e) => conflictIds.has(e.id)),
      status: v.status === 'maintenance' ? 'Maintenance' : 'Available',
    };
  });

  // ----- The signed-in staff member -----
  const me = profile ? withFirstName({
    ...profile,
    roleTitle: role === 'organizer' ? 'Event Organiser' : 'Student',
    office: role === 'organizer' ? (profile.department || 'Campus Events Office') : undefined,
  }) : withFirstName({ name: '', department: '', email: '', phone: '' });

  // ----- Real notifications for the top bar -----
  const notifications = r.notifications.map((n) => adaptNotification(n, role));
  const notificationsFor = () => notifications;

  return {
    empty,
    allEvents, myEvents, getEvent, conflicts, conflictsFor,
    registrations, rosterFor, attendanceFor, attendanceMethodFor, attendanceSummary, summarize,
    certificateRows, pendingCertificates, feedback, announcements, users, departments, clubs, venues,
    organizer: me, faculty: me, notifications, notificationsFor, students, studentById,
  };
}

// ================================ Student ================================
export function buildStudentData(raw, catalogEvents, profile) {
  const r = raw || { registrations: [], attendance: [], certificates: [], points: [], feedback: [], notifications: [] };
  const eventById = new Map(catalogEvents.map((e) => [e.id, e]));
  const student = withFirstName(profile ? { ...profile, detail: [profile.department, profile.year].filter(Boolean).join(', ') } : { name: '', role: 'Student' });

  const allRegs = r.registrations
    .map((x) => ({ eventId: x.event_id, regStatus: x.status, registeredOn: String(x.registered_at).slice(0, 10), event: eventById.get(x.event_id) }))
    .filter((x) => x.event);
  // Active registrations for events that still run. Cancelled events and cancelled registrations are listed separately
  // (history is kept; nothing is hidden or deleted).
  const registrations = allRegs.filter((x) => x.regStatus === 'registered' && x.event.status !== 'Cancelled');
  const registeredIds = registrations.map((x) => x.eventId);
  const cancelledRegistrations = allRegs
    .filter((x) => x.regStatus === 'cancelled' || (x.regStatus === 'registered' && x.event.status === 'Cancelled'))
    .map((x) => ({ ...x, reason: x.regStatus === 'cancelled' ? 'You cancelled this registration' : 'The event was cancelled' }))
    .sort((a, b) => b.event.date.localeCompare(a.event.date));
  const isDone = (x) => x.event.status === 'Completed';
  const upcoming = registrations.filter((x) => !isDone(x)).sort((a, b) => a.event.date.localeCompare(b.event.date));
  const completed = registrations.filter(isDone).sort((a, b) => b.event.date.localeCompare(a.event.date));

  const attendance = r.attendance
    .map((a) => ({ eventId: a.event_id, status: a.status === 'present' ? 'Present' : 'Absent', method: a.method === 'qr' ? 'QR check-in' : 'Marked by organizer', markedOn: String(a.marked_at).slice(0, 10), event: eventById.get(a.event_id) }))
    .filter((a) => a.event);
  const attendedIds = attendance.filter((a) => a.status === 'Present').map((a) => a.eventId);

  const certificates = r.certificates.map(adaptCertificate).map((c) => ({ ...c, event: eventById.get(c.eventId) })).filter((c) => c.event)
    .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn));
  const points = r.points
    .map((p) => ({ eventId: p.event_id, activity: p.reason, points: p.points, date: String(p.created_at).slice(0, 10), event: eventById.get(p.event_id) }))
    .filter((p) => p.event);
  const totalPoints = points.reduce((sum, p) => sum + p.points, 0);

  const submittedIds = r.feedback.map((f) => f.event_id);
  const today = todayISO();
  const feedbackPending = attendedIds.filter((id) => !submittedIds.includes(id)).map((id) => eventById.get(id)).filter((e) => e && e.date <= today);
  const feedbackDone = submittedIds.filter((id) => attendedIds.includes(id)).map((id) => eventById.get(id)).filter(Boolean);
  const feedbackDetails = Object.fromEntries(r.feedback.map((f) => [f.event_id, {
    ratings: { overall: f.overall_rating, organization: f.organization_rating, content: f.content_rating, speaker: f.speaker_rating, venue: f.venue_rating },
    comments: f.comment,
  }]));

  const notifications = r.notifications.map((n) => adaptNotification(n, 'student'));

  // Recent activity feed built from real records, newest first
  const title = (id) => eventById.get(id)?.title || 'an event';
  const activity = [
    ...registrations.map((x) => ({ id: `r-${x.eventId}`, text: `Registered for ${title(x.eventId)}`, date: x.registeredOn })),
    ...attendance.filter((a) => a.status === 'Present').map((a) => ({ id: `a-${a.eventId}`, text: `Attended ${title(a.eventId)}`, date: a.markedOn })),
    ...certificates.map((c) => ({ id: `c-${c.rowId}`, text: `Certificate issued for ${title(c.eventId)}`, date: c.issuedOn })),
    ...points.map((p) => ({ id: `p-${p.eventId}-${p.activity}`, text: `Earned ${p.points} points for ${title(p.eventId)}`, date: p.date })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return {
    student, registrations, registeredIds, upcoming, completed, cancelledRegistrations,
    attendance, attendedIds, certificates, points, totalPoints,
    feedbackPending, feedbackDone, feedbackDetails, activity,
    notifications, unreadCount: notifications.filter((n) => n.unread).length,
  };
}

// ----- Small shared calculations used by dashboards and analytics -----
export const helpers = { average, pct, round1, UPCOMING_LIFECYCLE, formatDate };

export function isUpcoming(event) {
  return event.date >= todayISO() && UPCOMING_LIFECYCLE.includes(event.lifecycle);
}
export function averageRating(feedbackList, key = 'overall') {
  const values = feedbackList.map((f) => f.ratings[key]).filter((v) => typeof v === 'number');
  return values.length ? round1(average(values)) : null;
}
export function fillRate(event) {
  return pct(event.registered, event.capacity);
}
