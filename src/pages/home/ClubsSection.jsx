import { Link } from 'react-router-dom';
import { Code2, Brain, Bot, ShieldCheck, Trophy, Palette, Music, Lightbulb } from 'lucide-react';
import SectionHeader from '../../components/SectionHeader';
import { countEventsByOrganizer } from '../../lib/eventUtils';
import { useCatalog } from '../../context/DataContext';

// Icons and short descriptions for well-known clubs. The list of clubs itself comes from the clubs table.
const organizers = [
  { organizer: 'Coding Club', icon: Code2, text: 'Hackathons, contests and coding bootcamps.' },
  { organizer: 'AI/ML Club', icon: Brain, text: 'Workshops on machine learning and AI.' },
  { organizer: 'Robotics Club', icon: Bot, text: 'Hands-on robotics builds and sessions.' },
  { organizer: 'Cyber Security Cell', icon: ShieldCheck, text: 'Seminars on safe and secure computing.' },
  { organizer: 'Sports Committee', icon: Trophy, text: 'Sports meets, leagues and tournaments.' },
  { organizer: 'Cultural Committee', icon: Palette, text: 'Cultural nights and stage programs.' },
  { organizer: 'Music Club', icon: Music, text: 'Live music events and band contests.' },
  { organizer: 'E-Cell', icon: Lightbulb, text: 'Summits and events for future founders.' },
];

export default function ClubsSection() {
  const { clubs, events } = useCatalog();
  const shown = clubs.filter((c) => c.is_active).map((c) => {
    const known = organizers.find((o) => o.organizer === c.name);
    return { organizer: c.name, icon: known?.icon || Lightbulb, text: known?.text || `${c.category || 'Campus'} events organised by ${c.name}.` };
  }).filter((c) => countEventsByOrganizer(events, c.organizer) > 0).slice(0, 8);
  return (
    <section className="section section-alt">
      <div className="container">
        <SectionHeader
          title="Built for the people who run events."
          text="Clubs, committees and departments use CampusFlow to publish events and reach students."
        />
        <div className="grid grid-4">
          {shown.map(({ organizer, icon: Icon, text }) => {
            const count = countEventsByOrganizer(events, organizer);
            return (
              <article key={organizer} className="card card-hover club-card">
                <span className="club-icon" aria-hidden="true"><Icon size={22} /></span>
                <h3>{organizer}</h3>
                <p>{text}</p>
                <Link to={`/events?q=${encodeURIComponent(organizer)}`} className="text-link">
                  {count} {count === 1 ? 'event' : 'events'}: view
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
