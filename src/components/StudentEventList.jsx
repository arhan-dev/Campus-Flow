import { Link } from 'react-router-dom';
import { Clock, MapPin } from 'lucide-react';
import Badge from './Badge';
import Button from './Button';
import { dateParts, formatDate } from '../lib/dates';

// Compact list of events. Takes registrations (each has an "event") plus the ids the student attended.
export default function StudentEventList({ registrations, attendedIds = [], compact = false, onCancel }) {
  return (
    <ul className="event-rows student-events">
      {registrations.map(({ event, registeredOn, reason }) => {
        const { day, month } = dateParts(event.date);
        const done = event.status === 'Completed';
        const cancelledEvent = event.status === 'Cancelled';
        const attended = attendedIds.includes(event.id);
        return (
          <li key={event.id}>
            <div className="date-tile" aria-hidden="true"><strong>{day}</strong><span>{month}</span></div>
            <div className="event-row-info">
              <Link to={`/events/${event.id}`}>{event.title}</Link>
              <p><Clock size={14} aria-hidden="true" /> {formatDate(event.date)}, {event.time}</p>
              <p><MapPin size={14} aria-hidden="true" /> {event.venue}</p>
              {!compact && registeredOn && <p className="row-muted">{reason ? `${reason}. ` : ''}Registered on {formatDate(registeredOn)}</p>}
            </div>
            <div className="event-row-status">
              <Badge variant={event.category.toLowerCase()}>{event.category}</Badge>
              {cancelledEvent
                ? <Badge variant="cancelled" dot>Event cancelled</Badge>
                : done
                ? <Badge variant={attended ? 'present' : 'completed'} dot>{attended ? 'Attended' : 'Completed'}</Badge>
                : <Badge variant="approved" dot>Registered</Badge>}
            </div>
            <Button to={`/events/${event.id}`} variant="outline" size="sm" className="row-action">View Event</Button>
            {onCancel && !done && !cancelledEvent && !attended && event.status !== 'Closed' && (
              <Button variant="ghost" size="sm" className="row-action" onClick={() => onCancel(event)} aria-label={`Cancel registration for ${event.title}`}>Cancel registration</Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
