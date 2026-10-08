import {
  Compass,
  Ticket,
  QrCode,
  Award,
  Bell,
  BarChart3,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SectionHeader from '../../components/SectionHeader';

const features = [
  {
    icon: Compass,
    title: 'Event Discovery',
    text: 'Find approved college events in one centralized place.',
    to: '/events',
    accent: 'blue',
    action: 'Explore events',
  },
  {
    icon: Ticket,
    title: 'Easy Registration',
    text: 'Register for events through a simple, reliable workflow.',
    to: '/events',
    accent: 'cyan',
    action: 'Register for events',
  },
  {
    icon: QrCode,
    title: 'Attendance Tracking',
    text: 'Track participation and attendance for registered events.',
    to: '/student/attendance',
    accent: 'green',
    action: 'View attendance',
  },
  {
    icon: Award,
    title: 'Digital Certificates',
    text: 'Access and manage event certificates digitally.',
    to: '/student/certificates',
    accent: 'purple',
    action: 'View certificates',
  },
  {
    icon: Bell,
    title: 'Notifications',
    text: 'Stay updated about event changes and announcements.',
    to: '/student/notifications',
    accent: 'orange',
    action: 'View notifications',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    text: 'Understand registrations, attendance, and event participation.',
    to: '/organizer/analytics',
    accent: 'indigo',
    action: 'View analytics',
  },
];

export default function FeaturesSection() {
  return (
    <section className="section">
      <div className="container">
        <SectionHeader
          title="Everything your campus needs."
          text="One connected platform for discovering, organizing, and participating in college events."
        />

        <div className="grid grid-3 feature-grid">
          {features.map(
            ({
              icon: Icon,
              title,
              text,
              to,
              accent,
              action,
            }) => (
              <Link
                key={title}
                to={to}
                className={`card feature-card feature-card-${accent}`}
              >
                <div className="feature-top">
                  <span
                    className="feature-icon"
                    aria-hidden="true"
                  >
                    <Icon size={22} />
                  </span>

                  <span className="feature-arrow">
                    →
                  </span>
                </div>

                <div className="feature-content">
                  <h3>{title}</h3>

                  <p>{text}</p>
                </div>

                <span className="feature-link">
                  {action}
                  <span aria-hidden="true"> →</span>
                </span>
              </Link>
            )
          )}
        </div>
      </div>
    </section>
  );
}
