import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  ShieldCheck,
  GraduationCap,
  BriefcaseBusiness,
} from 'lucide-react';
import Logo from './Logo';
import Button from './Button';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/events', label: 'Events' },
  { to: '/clubs', label: 'Clubs' },
  { to: '/about', label: 'About' },
];

const utilityLinks = [
  {
    to: '/verify-certificate',
    label: 'Verify certificate',
    icon: ShieldCheck,
  },
];

const dashboardLinks = [
  {
    to: '/student/dashboard',
    label: 'Student dashboard',
    icon: GraduationCap,
  },
  {
    to: '/organizer/dashboard',
    label: 'Event organiser',
    icon: BriefcaseBusiness,
  },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  // Prevent the page behind the drawer from scrolling on mobile.
  useEffect(() => {
    if (!open) {
      document.body.style.overflow = '';
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Allow Escape to close the mobile menu.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const navLinks = links.map((l) => (
    <NavLink
      key={l.to}
      to={l.to}
      end={l.end}
      className={({ isActive }) =>
        `nav-link ${isActive ? 'is-active' : ''}`
      }
    >
      {l.label}
    </NavLink>
  ));

  return (
    <>
      <header className="navbar">
        <div className="container navbar-inner">
          <Logo />

          <nav
            className="navbar-links"
            aria-label="Main navigation"
          >
            {navLinks}
          </nav>

          <div className="navbar-actions">
            <Button to="/login" variant="ghost">
              Login
            </Button>

            <Button to="/login" variant="primary">
              Get started
            </Button>
          </div>

          <button
            type="button"
            className="icon-btn navbar-toggle"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-drawer"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <div
        className={`drawer-overlay ${open ? 'is-open' : ''}`}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      <nav
        id="mobile-drawer"
        className={`drawer ${open ? 'is-open' : ''}`}
        aria-label="Mobile navigation"
      >
        <div className="drawer-scroll">
          <div className="drawer-section">
            <p className="drawer-section-title">
              Explore
            </p>

            <div className="drawer-links">
              {navLinks}
            </div>
          </div>

          <div className="drawer-section">
            <p className="drawer-section-title">
              Tools
            </p>

            <div className="drawer-links drawer-links-utility">
              {utilityLinks.map(
                ({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `drawer-tool-link ${
                        isActive ? 'is-active' : ''
                      }`
                    }
                  >
                    <Icon
                      size={18}
                      aria-hidden="true"
                    />

                    <span>{label}</span>
                  </NavLink>
                )
              )}
            </div>
          </div>

          <div className="drawer-section">
            <div className="drawer-section-heading">
              <p className="drawer-section-title">
                Dashboard access
              </p>

              <span className="drawer-section-note">
                Sign-in required
              </span>
            </div>

            <div className="drawer-dashboard-grid">
              {dashboardLinks.map(
                ({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="drawer-dashboard-link"
                  >
                    <Icon
                      size={18}
                      aria-hidden="true"
                    />

                    <span>{label}</span>
                  </Link>
                )
              )}
            </div>
          </div>
        </div>

        <div className="drawer-actions">
          <Button
            to="/login"
            variant="outline"
            fullWidth
          >
            Login
          </Button>

          <Button
            to="/login"
            variant="primary"
            fullWidth
          >
            Get started
          </Button>
        </div>
      </nav>
    </>
  );
}
