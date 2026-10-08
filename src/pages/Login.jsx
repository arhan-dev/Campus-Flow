import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Logo from '../components/Logo';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/DataContext';
import { roleHome, ROLES } from '../lib/constants';

const points = ['Find and register for events in seconds', 'Track your attendance and participation', 'Keep all your certificates in one place'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Real login with Supabase Auth. The role is NOT chosen here: it comes from the profiles table after login.
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from; // set when a visitor was sent here from a protected page
  const { configured, user, profile, role, loading, profileError, signIn, signUp, resetPassword, signOut } = useAuth();
  const { departments } = useCatalog();

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [form, setForm] = useState({ fullName: '', departmentId: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  // Once a signed-in user's profile is known, send them to the right place
  useEffect(() => {
    if (!user || !profile || profile.status !== 'active') return;
    const otherArea = ROLES.some((a) => a !== role && returnTo?.startsWith(`/${a}`));
    navigate(returnTo && !otherArea ? returnTo : roleHome(role), { replace: true });
  }, [user, profile, role, returnTo, navigate]);

  const set = (key) => (e) => { setForm({ ...form, [key]: e.target.value }); setErrors({ ...errors, [key]: undefined }); };

  const validate = () => {
    const found = {};
    if (!EMAIL.test(form.email.trim())) found.email = 'Enter a valid email address.';
    if (mode !== 'forgot' && form.password.length < 6) found.password = 'Use at least 6 characters.';
    if (mode === 'signup' && !form.fullName.trim()) found.fullName = 'Enter your full name.';
    return found;
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    setMessage({ type: '', text: '' });
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    if (mode === 'login') {
      const { error } = await signIn(form.email, form.password);
      if (error) setMessage({ type: 'error', text: error });
    } else if (mode === 'signup') {
      const { error, needsConfirmation } = await signUp(form);
      if (error) setMessage({ type: 'error', text: error });
      else if (needsConfirmation) { setMessage({ type: 'success', text: 'Account created. Check your email and click the confirmation link, then log in.' }); setMode('login'); }
    } else {
      const { error } = await resetPassword(form.email);
      setMessage(error ? { type: 'error', text: error } : { type: 'success', text: 'If an account exists for that email, a reset link is on its way.' });
    }
    setBusy(false);
  };

  if (!configured) {
    return (
      <main id="main" className="placeholder" role="alert">
        <h1>Backend not configured</h1>
        <p>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in a .env.local file, then restart the dev server. See the README for the steps.</p>
      </main>
    );
  }

  const blocked = user && profile && profile.status !== 'active';
  const title = { login: 'Welcome back', signup: 'Create your account', forgot: 'Reset your password' }[mode];
  const subtitle = {
    login: returnTo ? 'Log in to continue where you left off.' : 'Log in to continue to your dashboard.',
    signup: 'New accounts are student accounts. Event organiser accounts are created by the events office.',
    forgot: 'Enter your email and we will send you a reset link.',
  }[mode];

  return (
    <div className="login">
      <aside className="login-brand">
        <Logo to="/" light />
        <div>
          <h1>One platform for every college event.</h1>
          <p>Discover events, connect with your campus community, participate in experiences, and keep track of everything in one place.</p>
          <ul>
            {points.map((p) => <li key={p}><CheckCircle2 size={18} aria-hidden="true" /> {p}</li>)}
          </ul>
        </div>
        <p className="login-foot">&copy; 2026 CampusFlow</p>
      </aside>

      <main className="login-panel" id="main">
        <div className="card login-card">
          <div className="login-mobile-logo"><Logo /></div>
          <h2>{title}</h2>
          <p className="login-sub">{subtitle}</p>

          {blocked && (
            <p className="form-error" role="alert">
              Your account is {profile.status}. {profile.status === 'pending' ? 'It is waiting to be activated by the CampusFlow events office.' : 'Please contact the CampusFlow events office.'}{' '}
              <button type="button" className="link-btn" onClick={signOut}>Log out</button>
            </p>
          )}
          {profileError && <p className="form-error" role="alert">{profileError}</p>}
          {message.text && <p className={message.type === 'error' ? 'form-error' : 'form-success'} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</p>}

          <form onSubmit={submit} noValidate>
            {mode === 'signup' && (
              <>
                <div className="field">
                  <label htmlFor="fullName">Full name</label>
                  <input id="fullName" type="text" autoComplete="name" value={form.fullName} onChange={set('fullName')} aria-invalid={Boolean(errors.fullName)} />
                  {errors.fullName && <p className="field-error" role="alert">{errors.fullName}</p>}
                </div>
                <div className="field">
                  <label htmlFor="departmentId">Department (optional)</label>
                  <select id="departmentId" value={form.departmentId} onChange={set('departmentId')}>
                    <option value="">Choose a department</option>
                    {departments.filter((d) => d.is_active).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} aria-invalid={Boolean(errors.email)} />
              {errors.email && <p className="field-error" role="alert">{errors.email}</p>}
            </div>
            {mode !== 'forgot' && (
              <div className="field">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={set('password')} aria-invalid={Boolean(errors.password)} />
                {errors.password && <p className="field-error" role="alert">{errors.password}</p>}
              </div>
            )}
            {mode === 'login' && (
              <div className="login-options">
                <span />
                <button type="button" className="link-btn" onClick={() => { setMode('forgot'); setMessage({ type: '', text: '' }); setErrors({}); }}>Forgot password?</button>
              </div>
            )}
            <Button type="submit" size="lg" fullWidth disabled={busy || loading}>
              {busy || loading ? <><Loader2 size={18} className="spin" aria-hidden="true" /> Please wait</> : { login: 'Login', signup: 'Create account', forgot: 'Send reset link' }[mode]}
            </Button>
          </form>

          <div className="demo-accounts">
            {mode === 'login' && <p>New to CampusFlow? <button type="button" className="link-btn" onClick={() => { setMode('signup'); setMessage({ type: '', text: '' }); setErrors({}); }}>Create a student account</button></p>}
            {mode !== 'login' && <p>Already have an account? <button type="button" className="link-btn" onClick={() => { setMode('login'); setMessage({ type: '', text: '' }); setErrors({}); }}>Back to login</button></p>}
          </div>
        </div>
      </main>
    </div>
  );
}
