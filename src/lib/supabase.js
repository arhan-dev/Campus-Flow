import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// True when the two environment variables are set. The app shows a setup screen otherwise.
export const isSupabaseConfigured = Boolean(url && anonKey);

// The anon key is safe in the browser because Row Level Security protects the data.
// There is no service_role key anywhere in this project.
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
