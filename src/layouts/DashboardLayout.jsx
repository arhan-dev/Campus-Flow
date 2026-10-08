import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import NotificationDropdown from '../components/NotificationDropdown';
import ProfileMenu from '../components/ProfileMenu';
import Logo from '../components/Logo';
import DataGate from '../components/DataGate';
import { useAuth } from '../context/AuthContext';

// Shared shell for the student, student-facing and organiser dashboards.
export default function DashboardLayout({ navItems, homePath, user, profilePath, searchPath = '/events', notificationsPath }) {
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const logout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const search = (e) => {
    e.preventDefault();
    navigate(`${searchPath}?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className={`dash ${collapsed ? 'is-collapsed' : ''}`}>
      <a href="#main" className="skip-link">Skip to content</a>

      <Sidebar
        navItems={navItems}
        homePath={homePath}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogout={logout}
      />

      <div
        className={`dash-overlay ${drawerOpen ? 'is-open' : ''}`}
        onClick={() => setDrawerOpen(false)}
      />

      <div className="dash-main">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn only-mobile"
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={22} />
          </button>

          <button
            type="button"
            className="icon-btn only-desktop"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </button>

          <div className="topbar-logo only-mobile">
            <Logo to={homePath} />
          </div>

          <form className="topbar-search" onSubmit={search} role="search">
            <label htmlFor="dash-search" className="visually-hidden">
              Search events
            </label>

            <Search size={18} aria-hidden="true" />

            <input
              id="dash-search"
              type="search"
              placeholder="Search events..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>

          <div className="topbar-actions">
            <NotificationDropdown viewAllPath={notificationsPath} />

            <ProfileMenu
              user={user}
              profilePath={profilePath}
              onLogout={logout}
            />
          </div>
        </header>

        <main id="main" className="dash-content">
          <DataGate>
            <Outlet />
          </DataGate>
        </main>
      </div>
    </div>
  );
}
