import SectionHeader from '../../components/SectionHeader';
import EventCard from '../../components/EventCard';
import Button from '../../components/Button';
import { getUpcomingEvents } from '../../lib/eventUtils';
import { useCatalog } from '../../context/DataContext';

export default function UpcomingSection() {
  const { events, loading, error } = useCatalog();
  const upcoming = getUpcomingEvents(events, 6);
  return (
    <section className="section">
      <div className="container">
        <SectionHeader
          title="Upcoming events"
          text="Find your next event, competition, workshop, or campus experience."
        />
        {loading && <p className="panel-sub" role="status">Loading events...</p>}
        {error && !loading && <p className="form-error" role="alert">{error}</p>}
        {!loading && !error && upcoming.length === 0 && <p className="panel-sub">No upcoming events right now. Check back soon.</p>}
        <div className="grid grid-3">
          {upcoming.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
        <div className="section-cta">
          <Button to="/events" variant="outline" size="lg">View all events</Button>
        </div>
      </div>
    </section>
  );
}
