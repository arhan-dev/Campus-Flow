import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import Button from './Button';
import { useAuth } from '../context/AuthContext';
import { roleHome } from '../lib/constants';

// Route guard based on the REAL signed-in user (Supabase Auth) and the role stored in profiles.role.
// This only improves the experience: the database policies (RLS) are what actually protect the data.
export default function RequireRole({ role }) {
  const { user, profile, loading, profileError, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="placeholder" role="status" aria-live="polite">
        <Loader2 size={32} className="spin" aria-hidden="true" />
        <p>Checking your session...</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (!profile) {
    return (
      <main id="main" className="placeholder" role="alert">
        <div className="placeholder-icon" aria-hidden="true"><ShieldAlert size={32} /></div>
        <h1>We could not load your profile</h1>
        <p>{profileError || 'Please try again.'}</p>
        <Button variant="outline" onClick={async () => { await signOut(); navigate('/login'); }}>Log out</Button>
      </main>
    );
  }
  if (profile.status !== 'active') {
    return (
      <main id="main" className="placeholder" role="alert">
        <div className="placeholder-icon" aria-hidden="true"><ShieldAlert size={32} /></div>
        <h1>Your account is {profile.status}</h1>
        <p>{profile.status === 'pending' ? 'Your account is waiting to be activated by the events office.' : 'Your account has been deactivated. Please contact the events office.'}</p>
        <Button variant="outline" onClick={async () => { await signOut(); navigate('/login'); }}>Log out</Button>
      </main>
    );
  }
  if (role && profile.role !== role) {
    return (
      <main id="main" className="placeholder">
        <div className="placeholder-icon" aria-hidden="true"><ShieldAlert size={32} /></div>
        <h1>Access restricted</h1>
        <p>You are signed in with a {profile.role} account, so the {role} area is not available to you.</p>
        <div className="head-actions">
          <Button to={roleHome(profile.role)}>Go to my dashboard</Button>
          <Button variant="outline" onClick={async () => { await signOut(); navigate('/login', { state: { from: location.pathname + location.search } }); }}>Switch account</Button>
        </div>
        <Link to="/" className="text-link">Back to home</Link>
      </main>
    );
  }
  return <Outlet />;
}
