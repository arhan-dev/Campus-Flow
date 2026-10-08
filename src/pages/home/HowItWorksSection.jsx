import { Search, Ticket, QrCode, Award, BarChart3 } from 'lucide-react';

const steps = [
  { icon: Search, title: 'Discover', text: 'Find events happening across campus.' },
  { icon: Ticket, title: 'Register', text: 'Reserve your place in an event.' },
  { icon: QrCode, title: 'Attend', text: 'Participate and record attendance.' },
  { icon: Award, title: 'Certify', text: 'Receive participation recognition and certificates.' },
  { icon: BarChart3, title: 'Analyze', text: 'Event organisers review event activity and improve the campus experience.' },
];

export default function HowItWorksSection() {
  return (
    <section className="how">
      <div className="container">
        <h2>From discovery to participation.</h2>
        <p className="how-lifecycle">Create and publish on the organiser side. Register, attend, certify and analyze for everyone.</p>
        <ol className="how-steps">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="how-step">
              <span className="how-marker">
                <span className="how-number">{String(i + 1).padStart(2, '0')}</span>
                <Icon size={20} aria-hidden="true" />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
