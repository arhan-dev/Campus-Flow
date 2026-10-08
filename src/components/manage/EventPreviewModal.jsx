import Modal from '../Modal';
import Button from '../Button';
import EventSummary from './EventSummary';

// Preview of how an event looks. Only events that are already published get an "Open public page" button.
export default function EventPreviewModal({ event, onClose, title = 'Event preview' }) {
  if (!event) return null;
  const isPublic = event.id && !event.draftPreview && ['Approved', 'Registration Open', 'Registration Closed', 'Ongoing', 'Completed', 'Cancelled'].includes(event.lifecycle);
  return (
    <Modal
      open
      size="lg"
      title={title}
      onClose={onClose}
      footer={(
        <>
          {isPublic && <Button variant="outline" to={`/events/${event.id}`}>Open public page</Button>}
          <Button onClick={onClose}>Close</Button>
        </>
      )}
    >
      <EventSummary event={event} />
      <p className="modal-note">Preview of how students will see this event. Unsaved edits are not shown on the public page.</p>
    </Modal>
  );
}
