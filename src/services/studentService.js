import { supabase } from '../lib/supabase';
import { unwrap } from '../lib/errors';

// Everything here is the signed-in student's own data; row level security returns nothing else.
export async function fetchStudentRaw(userId) {
  const [registrations, attendance, certificates, points, feedback, notifications] = await Promise.all([
    supabase.from('event_registrations').select('id, event_id, status, registered_at, full_name, roll_number, branch').eq('student_id', userId),
    supabase.from('attendance').select('event_id, status, marked_at, method').eq('student_id', userId),
    supabase.from('certificates').select('*').eq('student_id', userId).eq('status', 'issued'),
    supabase.from('participation_points').select('event_id, points, reason, created_at').eq('student_id', userId),
    supabase.from('feedback').select('*').eq('student_id', userId),
    supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
  ]);
  return {
    registrations: unwrap(registrations, 'Could not load your registrations.'),
    attendance: unwrap(attendance, 'Could not load your attendance.'),
    certificates: unwrap(certificates, 'Could not load your certificates.'),
    points: unwrap(points, 'Could not load your points.'),
    feedback: unwrap(feedback, 'Could not load your feedback.'),
    notifications: unwrap(notifications, 'Could not load your notifications.'),
  };
}

// Registers the signed-in student. The database re-checks everything: event open, deadline, capacity, duplicates.
export async function registerForEvent(eventId, studentId, details = {}) {
  // One database transaction locks the event row, validates the deadline/branch/capacity,
  // prevents duplicates, and returns either registered or waitlisted.
  const result = unwrap(await supabase.rpc('register_for_event', {
    p_event_id: eventId,
    p_full_name: details.fullName,
    p_roll_number: details.rollNumber,
    p_branch: details.branch,
  }), 'Could not register you for this event.');
  return result;
}

export async function cancelRegistration(eventId, studentId) {
  unwrap(await supabase.rpc('cancel_event_registration', { p_event_id: eventId }), 'Could not cancel your registration.');
}

export async function submitFeedback(eventId, studentId, { ratings, comments }) {
  unwrap(await supabase.from('feedback').insert({
    event_id: eventId,
    student_id: studentId,
    organization_rating: ratings.organization,
    content_rating: ratings.content,
    speaker_rating: ratings.speaker,
    venue_rating: ratings.venue,
    overall_rating: ratings.overall,
    comment: comments || null,
  }), 'Could not submit your feedback.');
}
