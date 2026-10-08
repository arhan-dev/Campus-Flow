import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';

// Opened from the link in the password reset email (Supabase signs the visitor in for this one step).
export default function ResetPassword() {
  const { user, recovery, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Use at least 6 characters.'); return; }
    const { error: err } = await updatePassword(password);
    if (err) setError(err); else { setDone(true); setTimeout(() => navigate('/login'), 1500); }
  };

  return (
    <main id="main" className="login-panel" style={{ minHeight: '100vh' }}>
      <div className="card login-card">
        <div className="login-mobile-logo" style={{ display: 'block' }}><Logo /></div>
        <h2>Choose a new password</h2>
        {loading ? <p className="login-sub">Checking your reset link...</p>
          : !user && !recovery ? (
            <>
              <p className="login-sub">This reset link is missing or has expired. Request a new one from the login page.</p>
              <Link to="/login" className="text-link">Back to login</Link>
            </>
          ) : done ? <p className="form-success" role="status">Password changed. Taking you to the login page...</p> : (
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="new-password">New password</label>
                <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
                {error && <p className="field-error" role="alert">{error}</p>}
              </div>
              <Button type="submit" size="lg" fullWidth>Change password</Button>
            </form>
          )}
      </div>
    </main>
  );
}
