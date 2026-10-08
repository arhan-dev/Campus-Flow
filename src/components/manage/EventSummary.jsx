import { Calendar, Clock, MapPin, Building2, Users, User, Mail } from 'lucide-react';
import Badge from '../Badge';
import EventVisual from '../EventVisual';
import LifecycleBadge from './LifecycleBadge';
import { formatDate } from '../../lib/dates';

function Block({ title, empty, children, show }) {
  return (
    <section className="summary-block">
      <h3>{title}</h3>
      {show ? children : <p className="summary-empty">{empty}</p>}
    </section>
  );
}

// Compact event summary used for previews, approval review and the admin event page.
// It only reads fields, so it works for saved events and for a form that is still being filled in.
export default function EventSummary({ event, headingTag: Heading = 'h3', showStatus = true }) {
  const time = event.time ? (event.endTime ? `${event.time} to ${event.endTime}` : event.time) : 'Not set';
  const hasSchedule = event.schedule?.some(([t, a]) => t || a);
  return (
    <div className="summary">
      <EventVisual image={event.image || (event.category || 'technical').toLowerCase()} />
      <div className="details-badges">
        {event.category && <Badge variant={event.category.toLowerCase()}>{event.category}</Badge>}
        {showStatus && event.lifecycle && <LifecycleBadge status={event.lifecycle} />}
      </div>
      <Heading className="summary-title">{event.title || 'Untitled event'}</Heading>
      <p className="details-organizer">Organized by {event.organizer || 'Not set'}</p>

      <ul className="details-meta">
        <li><Calendar size={18} aria-hidden="true" /> {event.date ? formatDate(event.date) : 'Date not set'}</li>
        <li><Clock size={18} aria-hidden="true" /> {time}</li>
        <li><MapPin size={18} aria-hidden="true" /> {event.venue || 'Venue not set'}</li>
        <li><Building2 size={18} aria-hidden="true" /> {event.department || 'Department not set'}</li>
        <li><Users size={18} aria-hidden="true" /> Capacity: {event.capacity || 'Not set'}</li>
        <li><Calendar size={18} aria-hidden="true" /> Register by {event.registrationDeadline ? formatDate(event.registrationDeadline) : 'Not set'}</li>
      </ul>

      <Block title="About the event" show={Boolean(event.description)} empty="No description yet.">
        <p>{event.description}</p>
      </Block>
      <Block title="Schedule" show={hasSchedule} empty="No schedule added.">
        <ol className="timeline">
          {(event.schedule || []).filter(([t, a]) => t || a).map(([t, a], i) => (
            <li key={`${t}-${a}-${i}`}><strong>{t || '-'}</strong><span>{a}</span></li>
          ))}
        </ol>
      </Block>
      <Block title="Rules" show={event.rules?.some(Boolean)} empty="No rules added.">
        <ol className="rule-list">{event.rules?.filter(Boolean).map((r, i) => <li key={`${r}-${i}`}>{r}</li>)}</ol>
      </Block>
      <Block title="Prizes" show={event.prizes?.some(Boolean)} empty="No prizes listed.">
        <ul className="check-list">{event.prizes?.filter(Boolean).map((p, i) => <li key={`${p}-${i}`}>{p}</li>)}</ul>
      </Block>

      {(event.contactName || event.contactEmail) && (
        <Block title="Contact" show empty="">
          <ul className="summary-contact">
            {event.contactName && <li><User size={16} aria-hidden="true" /> {event.contactName}</li>}
            {event.contactEmail && <li><Mail size={16} aria-hidden="true" /> {event.contactEmail}</li>}
          </ul>
        </Block>
      )}
    </div>
  );
}
