import { useCatalog } from '../../context/DataContext';
import { getUpcomingEvents } from '../../lib/eventUtils';

// Live figures from the database: published events, upcoming events, seats reserved and active clubs.
export default function StatsSection() {
  const { events, clubs, loading, error } = useCatalog();
  if (error || (loading && events.length === 0)) return null;
  const stats = [
    { value: events.length, label: 'Events listed' },
    { value: getUpcomingEvents(events).length, label: 'Upcoming events' },
    { value: events.reduce((sum, e) => sum + e.registered, 0), label: 'Seats reserved' },
    { value: clubs.filter((c) => c.is_active).length, label: 'Clubs and committees' },
  ];
  return (
    <section className="container" aria-label="CampusFlow at a glance">
      <dl className="hero-stats">
        {stats.map((s) => (
          <div key={s.label} className="hero-stat">
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
