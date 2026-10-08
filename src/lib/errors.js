// Turns Supabase / PostgREST / database errors into messages a normal user can act on.
// Database rules raise errors that start with a code such as "CF_EVENT_FULL: ..." (see the SQL migration).
const CODE_MESSAGES = {
  CF_EVENT_FULL: 'This event is full. No seats are left.',
  CF_REGISTRATION_CLOSED: 'Registration is not open for this event.',
  CF_DEADLINE_PASSED: 'The registration deadline for this event has passed.',
  CF_EVENT_ENDED: 'This event has already taken place.',
  CF_EVENT_NOT_FOUND: 'This event could not be found.',
  CF_NOT_STUDENT: 'Only student accounts can register for events.',
  CF_NOT_REGISTERED: 'That student is not registered for this event.',
  CF_NOT_ATTENDED: 'A certificate can only be issued to a student who was marked present.',
  CF_FEEDBACK_NOT_ALLOWED: 'Feedback is only available after you have attended an event that has taken place.',
  CF_REASON_REQUIRED: 'A reason is required for this action.',
  CF_FORBIDDEN_STATUS: 'You are not allowed to make that status change.',
  CF_FORBIDDEN: 'You are not allowed to do that.',
  CF_EVENT_NOT_PUBLISHED: 'Attendance can only be marked for approved events.',
  CF_EVENT_CANCELLED: 'This event was cancelled.',
  CF_REGISTRATION_NOT_OPEN: 'Registration has not opened yet for this event.',
  CF_CANCEL_NOT_ALLOWED: 'This registration can no longer be cancelled (the event has started or you were marked present).',
  CF_NOT_AUTHENTICATED: 'Please log in to continue.',
  CF_INVALID_CODE: 'That attendance code is not valid. Check it and try again.',
  CF_SESSION_CLOSED: 'Check-in for this event has been closed by the organizer.',
  CF_SESSION_EXPIRED: 'This attendance code has expired. Ask the organizer for a new one.',
  CF_ALREADY_MARKED: 'You are already marked present for this event.',
  CF_ATTENDANCE_NOT_OPEN: 'QR attendance can only be opened on the day of the event, before it ends. Use manual attendance otherwise.',
  CF_BAD_DURATION: 'Choose a duration between 5 and 480 minutes.',
  CF_SELF_CHANGE: 'You cannot change your own role or account status.',
  CF_GALLERY_INVALID: 'The photo must be uploaded to your own storage folder.',
  CF_GALLERY_NOT_ALLOWED: 'Photos can be added once the event is approved.',
  CF_GALLERY_FULL: 'An event gallery can hold at most 60 photos.',
  CF_BAD_SETTING: 'That setting value is not allowed.',
};

export function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  const message = String(error.message || '');
  const code = /CF_[A-Z_]+/.exec(message)?.[0];
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  if (error.code === '23505') return 'That record already exists (for example you are already registered).';
  if (error.code === '23503') return 'That item is linked to other records and cannot be changed.';
  if (error.code === '23514') return 'One of the values is not allowed. Please check the form.';
  if (error.code === '42501' || /row-level security|permission denied/i.test(message)) return 'You do not have permission to do that.';
  if (error.code === 'PGRST301' || /jwt expired/i.test(message)) return 'Your session has expired. Please log in again.';
  if (/failed to fetch|networkerror|network request failed/i.test(message)) return 'Could not reach the server. Check your internet connection and try again.';
  if (/invalid login credentials/i.test(message)) return 'Incorrect email or password.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email address first. Check your inbox for the confirmation link.';
  if (/user already registered/i.test(message)) return 'An account with this email already exists. Try logging in instead.';
  if (/password should be at least/i.test(message)) return 'The password is too short. Use at least 6 characters.';
  if (/rate limit|too many requests/i.test(message)) return 'Too many attempts. Please wait a moment and try again.';
  return fallback;
}

// Throws a readable Error when a Supabase call failed, otherwise returns the data.
export function unwrap({ data, error }, fallback) {
  if (error) {
    const err = new Error(friendlyError(error, fallback));
    err.cause = error;
    throw err;
  }
  return data;
}
