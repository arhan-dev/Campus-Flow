import {
  Sparkles,
  Calendar,
  MapPin,
  GraduationCap,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import ProgressBar from '../../components/ProgressBar';
import { getRemainingSeats, getUpcomingEvents } from '../../lib/eventUtils';
import { formatDate } from '../../lib/dates';
import { useCatalog } from '../../context/DataContext';

const roles = [
  {
    icon: GraduationCap,
    name: 'Students',
    text: 'Discover, register, attend',
  },
  {
    icon: ShieldCheck,
    name: 'Event Organisers',
    text: 'Create, manage and analyze',
  },
];

const lifecycle = [
  'Create',
  'Publish',
  'Register',
  'Attend',
  'Certify',
  'Analyze',
];

function HeroPreview() {
  const { events } = useCatalog();
  const event = getUpcomingEvents(events, 1)[0];

  return (
    <div
      className="hero-preview"
      aria-label="How CampusFlow connects students and event organisers"
    >
      {event && (
        <div className="preview-card preview-event">
          <div className="preview-event-top">
            <Badge variant={event.category.toLowerCase()}>
              {event.category}
            </Badge>

            <span className="preview-live">
              <span />
              Registrations open
            </span>
          </div>

          <p className="preview-label">
            Featured upcoming event
          </p>

          <h3>{event.title}</h3>

          <ul>
            <li>
              <Calendar size={15} aria-hidden="true" />
              {formatDate(event.date)}, {event.time}
            </li>

            <li>
              <MapPin size={15} aria-hidden="true" />
              {event.venue}
            </li>
          </ul>

          <ProgressBar
            value={event.registered}
            max={event.capacity}
            label={`${event.title} registrations`}
          />

          <p className="preview-small">
            {event.registered} / {event.capacity} registered,{' '}
            {getRemainingSeats(event)} seats left
          </p>
        </div>
      )}

      <ul className="preview-card preview-roles">
        {roles.map(({ icon: Icon, name, text }) => (
          <li key={name}>
            <span className="preview-role-icon">
              <Icon size={18} aria-hidden="true" />
            </span>

            <div className="preview-role-content">
              <p className="preview-name">{name}</p>
              <p className="preview-small">{text}</p>
            </div>

            <span
              className="preview-role-check"
              style={{
                marginLeft: 'auto',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={17} aria-hidden="true" />
            </span>
          </li>
        ))}
      </ul>

      <div className="preview-card preview-flow">
        <p className="preview-label">
          Connected from start to finish
        </p>

        <p className="preview-small preview-flow-description">
          Every stage of your campus event in one place.
        </p>

        <ol>
          {lifecycle.map((step, i) => (
            <li key={step}>
              <span>{step}</span>

              {i < lifecycle.length - 1 && (
                <ChevronRight size={14} aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="hero-pill">
            <Sparkles size={14} aria-hidden="true" />
            Built for modern campus life
          </span>

          <h1>
            One platform for
            <span> every college event.</span>
          </h1>

          <p className="hero-text">
            CampusFlow brings students and event organisers
            together across the complete college event lifecycle — from the
            first idea to the final certificate.
          </p>

          <div className="hero-actions">
            <Button
              to="/events"
              size="lg"
              iconRight={ChevronRight}
            >
              Explore Events
            </Button>

            <Button
              to="/login"
              variant="outline"
              size="lg"
            >
              Get Started
            </Button>
          </div>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}
