import { Link } from 'react-router-dom';

export default function Logo({ to = '/', light = false }) {
  return (
    <Link to={to} className={`logo ${light ? 'logo-light' : ''}`} aria-label="CampusFlow home">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill={light ? '#ffffff' : '#1b2559'} />
        <path d="M8 20c4-8 12-8 16-2M8 14c4-6 10-6 14-1" stroke={light ? '#1b2559' : '#ffffff'} strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="24" cy="10" r="2.5" fill="#60a5fa" />
      </svg>
      <span>CampusFlow</span>
    </Link>
  );
}
