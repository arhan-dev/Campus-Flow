import { useState } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import { cancelEvent } from '../../services/eventsService';
import { CANCEL_REASON_MAX } from '../../lib/constants';

// Cancels an event with a reason. The event and its registrations are kept; everyone registered is notified (database trigger).
export default function CancelEventModal({ event, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await cancelEvent(event.id, reason);
      await onDone();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      title={`Cancel ${event.title}?`}
      onClose={() => !busy && onClose()}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Keep event</Button>
          <Button variant="danger" onClick={confirm} disabled={busy || !reason.trim()}>{busy ? 'Cancelling...' : 'Cancel event'}</Button>
        </>
      )}
    >
      <p>Registration will close and the {event.registered} registered {event.registered === 1 ? 'student' : 'students'} will be notified. The event and its registration history stay in the system. This cannot be undone.</p>
      <div className="field">
        <label htmlFor="cancel-reason">Reason (shown to students)</label>
        <textarea id="cancel-reason" rows={3} maxLength={CANCEL_REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: The speaker is unavailable." />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Modal>
  );
}

// Which events can still be cancelled (the database enforces the same rule)
export const canCancel = (event) => ['Approved', 'Registration Open', 'Registration Closed', 'Ongoing'].includes(event.lifecycle);
