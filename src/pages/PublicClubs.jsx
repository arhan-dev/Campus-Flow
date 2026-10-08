import { Link } from 'react-router-dom';
import { Users, Loader2, AlertTriangle } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import { countEventsByOrganizer } from '../lib/eventUtils';
import { useCatalog } from '../context/DataContext';

// Public list of active clubs and committees, read from the clubs table.
export default function PublicClubs() {
  const { clubs, events, loading, error, refresh } = useCatalog();
  const active = clubs.filter((c) => c.is_active);

  let body;
  if (loading && clubs.length === 0) {
    body = (
      <div className="placeholder" role="status" aria-live="polite">
        <Loader2 size={32} className="spin" aria-hidden="true" />
        <p>Loading clubs...</p>
      </div>
    );
  } else if (error && clubs.length === 0) {
    body = (
      <div className="placeholder" role="alert">
        <div className="placeholder-icon" aria-hidden="true"><AlertTriangle size={32} /></div>
        <p>We could not load the clubs right now.</p>
        <Button onClick={refresh}>Try again</Button>
      </div>
    );
  } else if (active.length === 0) {
    body = <EmptyState icon={Users} title="No clubs listed yet" text="Clubs and committees appear here once an event organiser adds them." />;
  } else {
    body = (
      <div className="grid grid-4">
        {active.map((club) => {
          const count = countEventsByOrganizer(events, club.name);
          return (
            <article key={club.id} className="card card-hover club-card">
              <span className="club-icon" aria-hidden="true"><Users size={22} /></span>
              <h2 style={{ fontSize: '1.1rem' }}>{club.name}</h2>
              <p>{club.category ? `${club.category} events and activities.` : 'Campus events and activities.'}</p>
              <Link to={`/events?q=${encodeURIComponent(club.name)}`} className="text-link">
                {count} {count === 1 ? 'event' : 'events'}: view
              </Link>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <section className="page-section">
      <div className="container">
        <SectionHeader as="h1" align="left" title="Campus clubs" text="Student clubs and committees that organise events on campus." />
        {body}
      </div>
    </section>
  );
}
