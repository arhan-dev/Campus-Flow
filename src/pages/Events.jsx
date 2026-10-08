import SectionHeader from '../components/SectionHeader';
import EventBrowser from '../components/EventBrowser';

export default function Events() {
  return (
    <section className="page-section">
      <div className="container">
        <SectionHeader
          as="h1"
          align="left"
          title="Discover Campus Events"
          text="Explore workshops, competitions, technical events, cultural programs, sports and more."
        />
        <EventBrowser />
      </div>
    </section>
  );
}
