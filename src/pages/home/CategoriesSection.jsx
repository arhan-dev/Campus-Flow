import { Link } from 'react-router-dom';
import { Cpu, Wrench, Rocket, Trophy, Palette, Mic, Medal } from 'lucide-react';
import SectionHeader from '../../components/SectionHeader';
import { useCatalog } from '../../context/DataContext';

// Names match the event_categories rows in the database, so the /events filter works.
const categories = [
  { name: 'Technical', icon: Cpu, text: 'Tech talks, expos and project showcases.' },
  { name: 'Workshop', icon: Wrench, text: 'Hands-on sessions to build new skills.' },
  { name: 'Hackathon', icon: Rocket, text: 'Build something with your team.' },
  { name: 'Sports', icon: Trophy, text: 'Tournaments, leagues and meets.' },
  { name: 'Cultural', icon: Palette, text: 'Music, dance, drama and art.' },
  { name: 'Seminar', icon: Mic, text: 'Learn from speakers and experts.' },
  { name: 'Competition', icon: Medal, text: 'Test your skills and win prizes.' },
];

export default function CategoriesSection() {
  const { events } = useCatalog();
  return (
    <section className="section section-alt">
      <div className="container">
        <SectionHeader title="Explore by category" text="Pick a type of event and see everything that is coming up." />
        <div className="grid grid-4">
          {categories.map(({ name, icon: Icon, text }) => {
            const count = events.filter((e) => e.category === name).length;
            return (
              <Link key={name} to={`/events?category=${name}`} className={`card card-hover category-card cat-${name.toLowerCase()}`}>
                <span className="category-icon" aria-hidden="true"><Icon size={24} /></span>
                <h3>{name}</h3>
                <p>{text}</p>
                <span className="category-count">{count} {count === 1 ? 'event' : 'events'}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
