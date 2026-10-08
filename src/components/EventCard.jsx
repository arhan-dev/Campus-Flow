import { Link } from 'react-router-dom';
import { Calendar, MapPin, User } from 'lucide-react';
import Badge from './Badge';
import Button from './Button';
import EventVisual from './EventVisual';
import ProgressBar from './ProgressBar';
import { dateParts, formatDate } from '../lib/dates';
import { getEventStatus, getRemainingSeats } from '../lib/eventUtils';

export default function EventCard({ event }) {
  const { day, month } = dateParts(event.date);
  const status = getEventStatus(event);
  const seatsLeft = getRemainingSeats(event);

  let availability = `${seatsLeft} seats left`;
  if (status === 'Full') availability = 'No seats left';
  if (status === 'Completed') availability = 'Event ended';

  return (
    <article className="card card-hover event-card">
      <div className="event-card-media">
        <EventVisual image={event.image} posterUrl={event.posterUrl} title={event.title} />
        <div className="event-date-chip" aria-hidden="true">
          <strong>{day}</strong>
          <span>{month}</span>
        </div>
      </div>

      <div className="event-card-body">
        <div className="event-card-badges">
          <Badge variant={event.category.toLowerCase()}>{event.category}</Badge>
          <Badge variant={status.toLowerCase()} dot>{status}</Badge>
        </div>

        <h3 className="event-card-title">
          <Link to={`/events/${event.id}`}>{event.title}</Link>
        </h3>

        <ul className="event-meta">
          <li><Calendar size={16} aria-hidden="true" /> {formatDate(event.date)}, {event.time}</li>
          <li><MapPin size={16} aria-hidden="true" /> {event.venue}</li>
          <li><User size={16} aria-hidden="true" /> {event.organizer}</li>
        </ul>

        <div className="event-progress">
          <ProgressBar value={event.registered} max={event.capacity} label={`${event.title} registrations`} />
          <p><span>{event.registered} / {event.capacity} registered</span><span>{availability}</span></p>
        </div>

        <Button to={`/events/${event.id}`} variant="outline" fullWidth>View details</Button>
      </div>
    </article>
  );
}
