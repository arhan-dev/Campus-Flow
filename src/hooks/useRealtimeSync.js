import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Supabase Realtime, used only where it helps: notifications, attendance and (for staff) registrations.
// Realtime applies each table's row level security, so a user is only told about rows they may read.
// A change does not patch local state; it just asks the data layer to reload from Supabase (debounced).
// If Realtime is not enabled on the project the app keeps working: data still reloads after every action.
export default function useRealtimeSync({ userId, role, onChange }) {
  const callback = useRef(onChange);
  callback.current = onChange;

  useEffect(() => {
    if (!supabase || !userId || !role) return undefined;
    let timer = null;
    const trigger = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callback.current(), 800);
    };

    const channel = supabase.channel(`campusflow-${role}-${userId}`);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, trigger);
    if (role === 'student') {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `student_id=eq.${userId}` }, trigger);
    } else {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, trigger);
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'event_registrations' }, trigger);
    }
    channel.subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId, role]);
}
