import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { friendlyError } from '../lib/errors';
import { adaptProfile } from '../services/adapters';

const AuthContext = createContext(null);

// Supabase Auth is the only source of truth for who is signed in.
// The role always comes from the profiles table, never from the browser.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured);
  const [loadedFor, setLoadedFor] = useState(null); // user id whose profile lookup has finished
  const [profileError, setProfileError] = useState('');
  const [recovery, setRecovery] = useState(false);

  // Restore the session after a refresh and follow sign in / sign out / token refresh
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') { setProfile(null); setRecovery(false); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const userId = session?.user?.id;

  const loadProfile = useCallback(async (id) => {
    setProfileError('');
    const { data, error } = await supabase.from('profiles').select('*, department:departments(id,name)').eq('id', id).maybeSingle();
    if (error) {
      setProfile(null);
      setProfileError(friendlyError(error, 'Could not load your profile.'));
    } else if (!data) {
      setProfile(null);
      setProfileError('Your account has no profile yet. Please contact the events office.');
    } else {
      setProfile(adaptProfile(data));
    }
    setLoadedFor(id);
  }, []);

  useEffect(() => {
    if (userId) loadProfile(userId);
    else { setProfile(null); setProfileError(''); setLoadedFor(null); }
  }, [userId, loadProfile]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error ? friendlyError(error, 'Could not log you in.') : null };
  }, []);

  // Public sign up always creates a STUDENT account. A database trigger creates the profile row.
  const signUp = useCallback(async ({ email, password, fullName, departmentId }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), department_id: departmentId || '' } },
    });
    if (error) return { error: friendlyError(error, 'Could not create your account.') };
    // When email confirmation is switched on in Supabase there is no session yet
    return { error: null, needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    return { error: error ? friendlyError(error, 'Could not send the reset email.') : null };
  }, []);

  const updatePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setRecovery(false);
    return { error: error ? friendlyError(error, 'Could not change your password.') : null };
  }, []);

  const refreshProfile = useCallback(async () => { if (userId) await loadProfile(userId); }, [userId, loadProfile]);

  const value = useMemo(() => ({
    configured: isSupabaseConfigured,
    user: session?.user || null,
    profile,
    role: profile?.status === 'active' ? profile.role : null,
    // loading until the session is known and, for a signed-in user, until their profile lookup has finished
    loading: sessionLoading || (Boolean(userId) && loadedFor !== userId),
    profileError,
    recovery,
    signIn, signUp, signOut, resetPassword, updatePassword, refreshProfile,
  }), [session, profile, sessionLoading, userId, loadedFor, profileError, recovery, signIn, signUp, signOut, resetPassword, updatePassword, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
