import { supabase } from '../lib/supabase';
import { unwrap } from '../lib/errors';

// QR attendance. Sessions are created and closed by database functions only; the student check-in function
// verifies the student, the registration, the event and the session again on the server.

// Organizer: the open (not closed) session of an event, or null. Row level security: owner and admins only.
export async function fetchOpenSession(eventId) {
  const rows = unwrap(
    await supabase.from('attendance_sessions').select('id, code, created_at, expires_at').eq('event_id', eventId).is('closed_at', null).order('created_at', { ascending: false }).limit(1),
    'Could not load the attendance session.',
  );
  return rows[0] || null;
}

export async function openAttendanceSession(eventId, minutes) {
  return unwrap(await supabase.rpc('open_attendance_session', { p_event_id: eventId, p_minutes: minutes }), 'Could not start QR attendance.');
}

export async function closeAttendanceSession(eventId) {
  unwrap(await supabase.rpc('close_attendance_session', { p_event_id: eventId }), 'Could not close QR attendance.');
}

// Student: marks the signed-in student present when the code is valid. Returns { event_id, event_title, status }.
export async function checkInWithCode(code) {
  return unwrap(await supabase.rpc('check_in_with_code', { p_code: code }), 'Could not check you in.');
}

// The text inside the QR: a link that opens the check-in page with the code filled in.
export const checkInUrl = (code) => `${window.location.origin}/student/check-in?code=${encodeURIComponent(code)}`;

// "A1B2C3D4E5F6" -> "A1B2-C3D4-E5F6" (easier to read out loud / type)
export const formatCode = (code) => (code || '').replace(/(.{4})(?=.)/g, '$1-');

// Pulls the code out of whatever was scanned or pasted: a check-in link or the bare code.
export function extractCode(text) {
  const raw = String(text || '').trim();
  try {
    const url = new URL(raw);
    const fromLink = url.searchParams.get('code');
    if (fromLink) return fromLink;
  } catch { /* not a link: treat as a typed code */ }
  return raw;
}
