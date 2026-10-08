import Button from '../../components/Button';

export default function CtaSection() {
  return (
    <section className="section">
      <div className="container">
        <div className="cta">
          <h2>Discover what's happening on campus.</h2>
          <p>Find events, explore opportunities, and stay connected with campus life.</p>
          <div className="cta-actions">
            <Button to="/events" variant="secondary" size="lg">Explore Events</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
