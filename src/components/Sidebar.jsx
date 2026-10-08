import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import Logo from './Logo';

export default function Sidebar({ navItems, homePath, open, onClose, onLogout }) {
  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Dashboard navigation">
      <div className="sidebar-head">
        <Logo to={homePath} />
        <button type="button" className="icon-btn sidebar-close" onClick={onClose} aria-label="Close navigation">
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {navItems.map(({ to, label, icon: Icon, heading }) => (heading ? (
            <li key={`heading-${heading}`} className="sidebar-heading" aria-hidden="true">{heading}</li>
          ) : (
            <li key={to}>
              <NavLink
                to={to}
                // A link whose path is the start of another link's path (My events / Create event) only matches itself
                end={navItems.some((o) => o.to && o.to !== to && o.to.startsWith(`${to}/`))}
                title={label}
                className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
              >
                <Icon size={20} aria-hidden="true" />
                <span className="sidebar-label">{label}</span>
              </NavLink>
            </li>
          )))}
        </ul>
      </nav>

      <div className="sidebar-foot">
        <button type="button" className="sidebar-link" onClick={onLogout} title="Log out">
          <LogOut size={20} aria-hidden="true" />
          <span className="sidebar-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
