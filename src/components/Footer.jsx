import { Link } from 'react-router-dom';
import Logo from './Logo';

const links = [
  { to: '/', label: 'Home' },
  { to: '/events', label: 'Events' },
  { to: '/clubs', label: 'Clubs' },
  { to: '/about', label: 'About' },
  {
    to: '/verify-certificate',
    label: 'Verify certificate',
  },
  { to: '/login', label: 'Login' },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-top">
        <div className="footer-brand">
          <Logo light />

          <p>
            One platform for every college event.
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <ul className="footer-links">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="container footer-bottom">
        <p>
          &copy; 2026 CampusFlow. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
