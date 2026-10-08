import {
  GraduationCap,
  ClipboardCheck,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import Button from '../components/Button';

const roles = [
  {
    title: 'Students',
    icon: GraduationCap,
    tone: 'student',
    text: 'Discover campus events, register in seconds, keep track of upcoming activities, view attendance, and access participation certificates from one place.',
  },
  {
    title: 'Event Organisers',
    icon: ClipboardCheck,
    tone: 'organizer',
    text: 'Create and publish events, manage registrations, clubs, attendance, certificates, announcements, feedback, venues, and event analytics from one command center.',
  },
];

export default function About() {
  return (
    <section className="page-section about-page">
      <div className="container">
        <div className="about-hero">
          <div className="about-hero-icon" aria-hidden="true">
            <Sparkles size={22} />
          </div>

          <SectionHeader
            as="h1"
            align="left"
            title="About CampusFlow"
            text="One platform for every college event. CampusFlow brings students and event organisers together in one connected system to create, publish, discover, register for, attend, and manage campus events."
          />
        </div>

        <div className="about-roles">
          <div className="about-section-heading">
            <span>Built for every campus role</span>

            <h2>One platform. Two experiences.</h2>

            <p>
              Each role gets the tools they need while the whole campus works
              from the same event lifecycle.
            </p>
          </div>

          <div className="grid grid-3">
            {roles.map(({ title, icon: Icon, tone, text }) => (
              <article
                key={title}
                className={`card about-role-card about-role-${tone}`}
              >
                <div className="about-role-icon" aria-hidden="true">
                  <Icon size={25} />
                </div>

                <div className="about-role-content">
                  <span className="about-role-label">
                    {tone === 'student'
                      ? 'For students'
                      : tone === 'organizer'
                        ? 'For organizers'
                        : 'For campus leadership'}
                  </span>

                  <h2>{title}</h2>

                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="about-verification card">
          <div>
            <span className="about-verification-kicker">
              Trust & verification
            </span>

            <h2>Certificates you can verify.</h2>

            <p>
              Certificates issued through CampusFlow carry a certificate number
              and verification code that can be checked through the public
              certificate verification page.
            </p>
          </div>

          <div className="about-verification-actions">
            <Button to="/events">
              Browse events
            </Button>

            <Button to="/verify-certificate" variant="outline">
              Verify a certificate
              <ArrowRight size={17} />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
