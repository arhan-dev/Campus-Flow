import { categoryIcons } from '../data/categoryMeta';

const categoryLabels = {
  technical: 'Technical',
  cultural: 'Cultural',
  sports: 'Sports',
  workshop: 'Workshop',
  hackathon: 'Hackathon',
  competition: 'Competition',
  seminar: 'Seminar',
};

// Colourful artwork for an event. When the organizer uploaded a poster it is shown instead.
export default function EventVisual({ image, size = 'md', posterUrl, title }) {
  const Icon = categoryIcons[image] || categoryIcons.technical;
  if (posterUrl) {
    return (
      <div className={`event-visual event-visual-${size} event-visual-poster`}>
        <img src={posterUrl} alt={title ? `Poster for ${title}` : 'Event poster'} loading="lazy" />
      </div>
    );
  }
  return (
    <div className={`event-visual event-visual-${size} cat-${image}`} aria-hidden="true">
      <span className="event-visual-ring event-visual-ring-1" />
      <span className="event-visual-ring event-visual-ring-2" />
      <div className="event-visual-poster-copy">
        <span className="event-visual-kicker">CAMPUSFLOW EVENT</span>
        <Icon className="event-visual-icon" size={size === 'lg' ? 72 : 44} strokeWidth={1.5} />
        <span className="event-visual-category">{categoryLabels[image] || 'Campus Event'}</span>
        {title && <strong className="event-visual-title">{title}</strong>}
      </div>
      <span className="event-visual-footer">DISCOVER • REGISTER • ATTEND</span>
    </div>
  );
}
