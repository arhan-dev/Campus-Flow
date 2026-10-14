import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Calendar, Clock, MapPin, User, Building2, Users, CheckCircle2, Ban } from 'lucide-react';
import EventGallery from '../components/EventGallery';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Breadcrumbs from '../components/Breadcrumbs';
import EventVisual from '../components/EventVisual';
import EventCard from '../components/EventCard';
import ProgressBar from '../components/ProgressBar';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/DataContext';
import { registerForEvent } from '../services/studentService';
import useStudentData from '../hooks/useStudentData';
import { formatDate } from '../lib/dates';
import { getEventStatus, getRelatedEvents } from '../lib/eventUtils';

// Wrapper: a new key resets the page state when the visitor opens a related event
export default function EventDetails() {
  const { id } = useParams();
  return <EventDetailsContent key={id} id={id} />;
}

function EventDetailsContent({ id }) {
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();
  const { events, getEvent, loading, error: loadError, refresh, departmentNames: DEPARTMENTS } = useCatalog();
  const event = getEvent(id);
  const [modal, setModal] = useState(null); // null | 'login' | 'confirm' | 'not-student'
  const [busy, setBusy] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registrationDetails, setRegistrationDetails] = useState({ fullName: profile?.name || '', rollNumber: profile?.studentNumber || '', branch: profile?.department || '' });
  const { registeredIds, refresh: refreshStudent } = useStudentData();
  const [toast, setToast] = useState('');
  const closeToast = useCallback(() => setToast(''), []);
  const closeModal = useCallback(() => { setModal(null); setRegisterError(''); }, []);

  if (loading) {
    return (
      <div className="placeholder" role="status" aria-live="polite">
        <Loader2 size={32} className="spin" aria-hidden="true" />
        <p>Loading event...</p>
      </div>
    );
  }
  if (loadError && !event) {
    return (
      <div className="placeholder" role="alert">
        <h1>We could not load this event</h1>
        <p>{loadError}</p>
        <Button onClick={refresh}>Try again</Button>
      </div>
    );
  }
  if (!event) {
    return (
      <div className="placeholder">
        <h1>Event not found</h1>
        <p>This event does not exist or may have been removed.</p>
        <Button to="/events">Back to Events</Button>
      </div>
    );
  }

  const status = getEventStatus(event);
  // Registered state comes from the student's real registrations in Supabase, so it matches My Events.
  const registered = role === 'student' && registeredIds.includes(event.id);
  const isFull = status === 'Full';
  const isCompleted = status === 'Completed';
  const isCancelled = status === 'Cancelled';
  const notYetOpen = status === 'Upcoming';
  const isClosed = status === 'Closed';
  const registeredCount = event.registered; // live count from the database
  const seatsLeft = Math.max(event.capacity - registeredCount, 0);
  const related = getRelatedEvents(events, event, 3);

  // Visitors must log in first. Only student accounts can register; the database enforces this too.
  const startRegistration = () => setModal(!user ? 'login' : role === 'student' ? 'confirm' : 'not-student');
  const goToLogin = () => navigate('/login', { state: { from: `/events/${event.id}` } });
  const confirm = async () => {
    setBusy(true);
    setRegisterError('');
    try {
      if (!registrationDetails.fullName.trim() || !registrationDetails.rollNumber.trim() || !registrationDetails.branch.trim()) throw new Error('Enter your full name, roll number and branch.');
      const result = await registerForEvent(event.id, profile.id, { fullName: registrationDetails.fullName.trim(), rollNumber: registrationDetails.rollNumber.trim(), branch: registrationDetails.branch.trim() });
      await Promise.all([refresh(), refreshStudent()]);
      setModal(null);
      setToast(result?.status === 'waitlisted' ? 'The event is full. You have been added to the waitlist.' : 'Registration successful! Your entry QR pass is available in My Events.');
    } catch (e) {
      setRegisterError(e.message);
      refresh(); // the seat count may have changed (for example the event just filled up)
    } finally {
      setBusy(false);
    }
  };

  let buttonLabel = 'Register Now';
  if (isCancelled) buttonLabel = 'Event Cancelled';
  else if (isCompleted) buttonLabel = 'Event Completed';
  else if (registered) buttonLabel = 'Registered';
  else if (isFull) buttonLabel = 'Registration Full';
  else if (notYetOpen) buttonLabel = 'Registration Not Open Yet';
  else if (isClosed) buttonLabel = 'Registration Closed';

  return (
    <section className="page-section">
      <div className="container">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Events', to: '/events' }, { label: event.title }]} />

        <div className="details-top">
          <EventVisual image={event.image} size="lg" posterUrl={event.posterUrl} title={event.title} />

          <div className="details-info">
            <div className="details-badges">
              <Badge variant={event.category.toLowerCase()}>{event.category}</Badge>
              <Badge variant={status.toLowerCase()} dot>{status}</Badge>
            </div>
            <h1>{event.title}</h1>
            <p className="details-organizer">Organized by {event.organizer}</p>
            <ul className="details-meta">
              <li><Calendar size={18} aria-hidden="true" /> {formatDate(event.date)}</li>
              <li><Clock size={18} aria-hidden="true" /> {event.time}</li>
              <li><MapPin size={18} aria-hidden="true" /> {event.venue}</li>
              <li><Building2 size={18} aria-hidden="true" /> {event.department}</li>
            </ul>

            <div className="card register-card">
              <div className="register-head">
                <h2>Registration</h2>
                <Badge variant={registered && !isCompleted && !isCancelled ? 'approved' : status.toLowerCase()} dot>{registered && !isCompleted && !isCancelled ? 'You are registered' : status}</Badge>
              </div>
              <p className="register-seats"><strong>{registeredCount} / {event.capacity}</strong> registered</p>
              <ProgressBar value={registeredCount} max={event.capacity} label="Seats filled" />
              {isCancelled && <p className="register-deadline" role="note"><Ban size={14} aria-hidden="true" /> This event was cancelled{event.cancellationReason ? `: ${event.cancellationReason}` : '.'}</p>}
              <p className="register-deadline">
                {isCancelled ? 'Registration is closed.'
                  : isCompleted ? 'This event has ended.'
                    : notYetOpen ? `Registration opens ${event.registrationOpensOn ? formatDate(event.registrationOpensOn) : 'soon'} and closes ${formatDate(event.registrationDeadline)}.`
                      : isClosed ? 'Registration for this event has closed.'
                        : `${seatsLeft} ${seatsLeft === 1 ? 'seat' : 'seats'} remaining. Registration closes ${formatDate(event.registrationDeadline)}.`}
              </p>
              <Button
                size="lg"
                fullWidth
                icon={registered && !isCompleted && !isCancelled ? CheckCircle2 : undefined}
                variant={registered && !isCompleted && !isCancelled ? 'secondary' : 'primary'}
                disabled={isFull || isCompleted || isCancelled || notYetOpen || isClosed || registered}
                onClick={startRegistration}
              >
                {buttonLabel}
              </Button>
              {registered && (
                <div className="register-links">
                  <Link to="/student/my-events" className="register-back">View in My Events</Link>
                  <Link to="/events" className="register-back">Back to all events</Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="details-body">
          <div className="details-main">
            <article className="details-block">
              <h2>About the event</h2>
              <p>{event.description}</p>
            </article>

            {event.schedule?.length > 0 && (
              <article className="details-block">
                <h2>Event schedule</h2>
                <ol className="timeline">
                  {event.schedule.map(([time, text]) => (
                    <li key={time + text}><strong>{time}</strong><span>{text}</span></li>
                  ))}
                </ol>
              </article>
            )}

            {event.rules?.length > 0 && (
              <article className="details-block">
                <h2>Rules</h2>
                <ol className="rule-list">{event.rules.map((r) => <li key={r}>{r}</li>)}</ol>
              </article>
            )}

            <EventGallery eventId={event.id} />

            {event.prizes?.length > 0 && (
              <article className="details-block">
                <h2>Prizes</h2>
                <ul className="check-list">{event.prizes.map((p) => <li key={p}>{p}</li>)}</ul>
              </article>
            )}
          </div>

          <aside className="details-side">
            <div className="card side-card">
              <h2>Organizer</h2>
              <p className="side-title"><User size={16} aria-hidden="true" /> {event.organizer}</p>
              <p className="side-text"><Building2 size={16} aria-hidden="true" /> {event.department}</p>
            </div>
            <div className="card side-card">
              <h2>Venue</h2>
              <p className="side-title"><MapPin size={16} aria-hidden="true" /> {event.venue}</p>
              <p className="side-text"><Users size={16} aria-hidden="true" /> Event capacity: {event.capacity} participants</p>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <div className="related">
            <h2>Related events</h2>
            <div className="grid grid-3">
              {related.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={modal === 'login'}
        title="Login required"
        onClose={closeModal}
        footer={(
          <>
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button onClick={goToLogin}>Login</Button>
          </>
        )}
      >
        <p>Sign in to CampusFlow to register for this event. You will come back to this page afterwards.</p>
      </Modal>

      <Modal
        open={modal === 'confirm'}
        title={`Register for ${event.title}`}
        onClose={closeModal}
        footer={(
          <>
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button onClick={confirm} disabled={busy}>{busy ? 'Registering...' : 'Confirm Registration'}</Button>
          </>
        )}
      >
        <ul className="modal-summary">
          <li><Calendar size={16} aria-hidden="true" /> {formatDate(event.date)}, {event.time}</li>
          <li><MapPin size={16} aria-hidden="true" /> {event.venue}</li>
        </ul>
        <div className="field"><label htmlFor="reg-full-name">Full name *</label><input id="reg-full-name" value={registrationDetails.fullName} onChange={(e) => setRegistrationDetails((v) => ({ ...v, fullName: e.target.value }))} autoComplete="name" required /></div>
        <div className="field"><label htmlFor="reg-roll-number">College roll number *</label><input id="reg-roll-number" value={registrationDetails.rollNumber} onChange={(e) => setRegistrationDetails((v) => ({ ...v, rollNumber: e.target.value }))} autoComplete="off" required /></div>
        <div className="field"><label htmlFor="reg-branch">Branch *</label><select id="reg-branch" value={registrationDetails.branch} onChange={(e) => setRegistrationDetails((v) => ({ ...v, branch: e.target.value }))} required><option value="">Select your branch</option>{(event.allowedBranches?.length ? event.allowedBranches : (DEPARTMENTS || [])).map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
        {event.allowedBranches?.length > 0 && <p className="field-hint">This event is open only to: {event.allowedBranches.join(', ')}.</p>}
        {registerError && <p className="form-error" role="alert">{registerError}</p>}
      </Modal>

      <Modal
        open={modal === 'not-student'}
        title="Student account needed"
        onClose={closeModal}
        footer={<Button onClick={closeModal}>OK</Button>}
      >
        <p>You are signed in with a {role} account. Only student accounts can register for events.</p>
      </Modal>

      <Toast message={toast} onDone={closeToast} />
    </section>
  );
}
