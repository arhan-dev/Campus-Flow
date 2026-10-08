import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarX } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import Badge from '../../components/Badge';
import useStudentData from '../../hooks/useStudentData';
import { formatDate } from '../../lib/dates';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Simple month view of the events the student registered for. No calendar library.
export default function StudentCalendar() {
  const { registrations, upcoming } = useStudentData();
  const first = upcoming[0]?.event.date ?? '2026-09-30';
  const [view, setView] = useState({ year: Number(first.slice(0, 4)), month: Number(first.slice(5, 7)) - 1 });

  const monthStart = new Date(Date.UTC(view.year, view.month, 1));
  const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
  const offset = (monthStart.getUTCDay() + 6) % 7; // Monday first
  const label = monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const prefix = `${view.year}-${String(view.month + 1).padStart(2, '0')}`;

  const inMonth = registrations.filter((r) => r.event.date.startsWith(prefix)).sort((a, b) => a.event.date.localeCompare(b.event.date));
  const eventDays = new Set(inMonth.map((r) => Number(r.event.date.slice(8, 10))));

  const move = (delta) => {
    const d = new Date(Date.UTC(view.year, view.month + delta, 1));
    setView({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  };

  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="dash-page">
      <PageHeader title="Calendar" text="See the events you registered for, by date." crumb="Calendar" />

      <div className="calendar-layout">
        <section className="card panel" aria-labelledby="cal-heading">
          <div className="calendar-head">
            <button type="button" className="icon-btn" onClick={() => move(-1)} aria-label="Previous month"><ChevronLeft size={20} /></button>
            <h2 id="cal-heading">{label}</h2>
            <button type="button" className="icon-btn" onClick={() => move(1)} aria-label="Next month"><ChevronRight size={20} /></button>
          </div>
          <div className="calendar-grid" role="grid" aria-label={label}>
            {WEEKDAYS.map((d) => <span key={d} className="calendar-weekday" role="columnheader">{d}</span>)}
            {cells.map((day, i) => (
              <span
                key={i}
                role="gridcell"
                className={`calendar-cell ${day ? '' : 'is-empty'} ${day && eventDays.has(day) ? 'has-event' : ''}`}
                aria-label={day && eventDays.has(day) ? `${day}, registered event` : undefined}
              >
                {day}
              </span>
            ))}
          </div>
          <p className="panel-sub">Highlighted dates are events you registered for.</p>
        </section>

        <section className="card panel" aria-labelledby="cal-list-heading">
          <h2 id="cal-list-heading">Events in {label}</h2>
          {inMonth.length > 0 ? (
            <ul className="activity-list">
              {inMonth.map(({ event }) => (
                <li key={event.id}>
                  <span className="activity-dot is-unread" aria-hidden="true" />
                  <div>
                    <p><Link to={`/events/${event.id}`} className="text-link">{event.title}</Link></p>
                    <span>{formatDate(event.date)}, {event.time} at {event.venue}</span>
                  </div>
                  <Badge variant={event.status === 'Completed' ? 'completed' : 'approved'}>{event.status === 'Completed' ? 'Completed' : 'Registered'}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={CalendarX} title="No registered events this month" text="Browse events to find something to join." actionLabel="Explore Events" actionTo="/student/events" />
          )}
        </section>
      </div>
    </div>
  );
}
