import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, User, LogOut } from 'lucide-react';
import Avatar from './Avatar';
import useClickOutside from '../hooks/useClickOutside';

export default function ProfileMenu({ user, profilePath, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className="profile-btn"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        <Avatar name={user.name} size={34} />
        <span className="profile-name">{user.name}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {open && (
        <div className="dropdown-panel profile-panel">
          <div className="profile-panel-head">
            <p>{user.name}</p>
            <span>{user.role}</span>
          </div>
          <Link to={profilePath} className="menu-item" onClick={() => setOpen(false)}>
            <User size={18} aria-hidden="true" /> My profile
          </Link>
          <button type="button" className="menu-item" onClick={onLogout}>
            <LogOut size={18} aria-hidden="true" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
