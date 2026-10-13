import { Link } from 'react-router-dom';

export default function StatCard({ label, value, note, tone = 'primary', icon: Icon, to }) {
  const content = (
    <>
      {Icon && <span className="stat-icon" aria-hidden="true"><Icon size={20} /></span>}
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
      {note && <p className="stat-note">{note}</p>}
      {to && <span className="stat-card-hint" aria-hidden="true">View details →</span>}
    </>
  );
  const className = `card stat-card stat-${tone}${to ? ' stat-card-link' : ''}`;
  return to ? <Link to={to} className={className} aria-label={`${label}: ${value}. View details`}>{content}</Link> : <div className={className}>{content}</div>;
}
