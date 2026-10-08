import { useState } from 'react';
import { Check, X } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
import Field from './Field';
import EventSummary from './EventSummary';
import ConflictNotice from './ConflictNotice';
import useCampusData from '../../hooks/useCampusData';
import { approveEvent, rejectEvent } from '../../services/eventsService';
import { REJECTION_REASONS } from '../../lib/constants';
import { formatDate } from '../../lib/dates';

// Admin review of one event: read the details, then approve or reject with a reason.
// The decision is saved to Supabase. Only an admin can do this: the database refuses anyone else.
// Mount it with a key so it starts fresh for each event.
export default function ApprovalReviewModal({ event, initialMode = 'review', onClose, onToast }) {
  const [mode, setMode] = useState(initialMode);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { conflictsFor, refresh } = useCampusData();
  if (!event) return null;

  const approve = async () => {
    setBusy(true);
    try {
      await approveEvent(event.id);
      await refresh();
      onToast('Event approved.');
      onClose();
    } catch (e) {
      onToast(e.message, 'error');
      refresh();
    } finally {
      setBusy(false);
    }
  };
  const reject = async () => {
    if (!reason) {
      setError('Choose a reason for rejecting this event.');
      return;
    }
    setBusy(true);
    try {
      await rejectEvent(event.id, reason, note);
      await refresh();
      onToast('Event rejected.');
      onClose();
    } catch (e) {
      onToast(e.message, 'error');
      refresh();
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'reject') {
    return (
      <Modal
        open
        title={`Reject ${event.title}`}
        onClose={onClose}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setMode('review')}>Back</Button>
            <Button variant="danger" icon={X} onClick={reject} disabled={busy}>{busy ? 'Rejecting...' : 'Reject event'}</Button>
          </>
        )}
      >
        <p>The organizer will see this reason next to the event and get a notification.</p>
        <div className="modal-form">
          <Field id="reject-reason" label="Reason" required error={error}>
            <select value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }}>
              <option value="">Choose a reason</option>
              {REJECTION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field id="reject-note" label="Note for the organizer" hint="Optional. Explain what should change.">
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          </Field>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      size="lg"
      title="Review event"
      onClose={onClose}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button variant="danger" icon={X} onClick={() => setMode('reject')}>Reject Event</Button>
          <Button variant="secondary" icon={Check} onClick={approve} disabled={busy}>{busy ? 'Approving...' : 'Approve Event'}</Button>
        </>
      )}
    >
      <ConflictNotice venue={event.venue} others={conflictsFor(event)} />
      {event.submittedOn && <p className="summary-submitted">Submitted on {formatDate(event.submittedOn)}</p>}
      <EventSummary event={event} />
      <p className="modal-note">Your decision is saved and the organizer is notified.</p>
    </Modal>
  );
}
