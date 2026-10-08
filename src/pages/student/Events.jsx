import PageHeader from '../../components/PageHeader';
import EventBrowser from '../../components/EventBrowser';

// Event discovery inside the student dashboard. Same search and filters as the public Events page.
export default function StudentEvents() {
  return (
    <div className="dash-page">
      <PageHeader title="Discover events" text="Find something to join. Open an event to see details and register." crumb="Events" />
      <EventBrowser gridClass="grid-auto" />
    </div>
  );
}
