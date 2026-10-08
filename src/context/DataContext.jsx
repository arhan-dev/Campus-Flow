import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { fetchCatalog } from '../services/catalogService';
import { fetchStudentRaw } from '../services/studentService';
import { fetchCampusRaw } from '../services/campusService';
import { syncLifecycle } from '../services/eventsService';
import useRealtimeSync from '../hooks/useRealtimeSync';
import { friendlyError } from '../lib/errors';
import { buildCampusData, buildStudentData } from '../data/campusSelectors';

const DataContext = createContext(null);

// Loads the data each role needs from Supabase and exposes it to the pages.
// Supabase is the source of truth; this is only a cache. After every change a page calls refresh().
export function DataProvider({ children }) {
  const { configured, profile, role } = useAuth();
  const [catalog, setCatalog] = useState(null);
  const [roleRaw, setRoleRaw] = useState(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState('');
  const loadId = useRef(0);
  const lastSync = useRef(0);

  const userId = profile?.id;

  const refresh = useCallback(async () => {
    if (!configured) return;
    const myLoad = ++loadId.current;
    // Ask the database to write the current lifecycle stage into events.status (at most once a minute). Fire and forget:
    // the stage shown below and the registration rules come from the live status, never from this call.
    if (Date.now() - lastSync.current > 60000) {
      lastSync.current = Date.now();
      syncLifecycle().catch(() => {});
    }
    try {
      const nextCatalog = await fetchCatalog();
      let nextRole = null;
      if (userId && role === 'student') nextRole = await fetchStudentRaw(userId);
      if (userId && (role === 'organizer')) nextRole = await fetchCampusRaw(userId);
      if (myLoad !== loadId.current) return; // a newer load started; ignore this result
      setCatalog(nextCatalog);
      setRoleRaw(nextRole);
      setError('');
    } catch (e) {
      if (myLoad !== loadId.current) return;
      setError(e.message || friendlyError(e));
    } finally {
      if (myLoad === loadId.current) setLoading(false);
    }
  }, [configured, userId, role]);

  // Reload when the signed-in user (or their role) changes. Clear the old person's data first.
  useEffect(() => {
    setRoleRaw(null);
    setLoading(true);
    refresh();
  }, [refresh]);

  // Realtime for notifications / attendance / registrations, and a slow refresh so stages such as "Ongoing" tick over
  useRealtimeSync({ userId, role, onChange: refresh });
  useEffect(() => {
    if (!configured) return undefined;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 120000);
    return () => clearInterval(timer);
  }, [configured, refresh]);

  const value = useMemo(() => {
    const events = catalog?.events || [];
    const studentData = role === 'student' ? buildStudentData(roleRaw, events, profile) : null;
    const campusData = role === 'organizer' ? buildCampusData(roleRaw, profile) : null;
    return { catalog, events, loading, error, refresh, studentData, campusData };
  }, [catalog, roleRaw, loading, error, refresh, role, profile]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('Data hooks must be used inside DataProvider');
  return ctx;
}

// Published events and reference lists (visible to everyone)
export function useCatalog() {
  const { catalog, events, loading, error, refresh } = useData();
  return useMemo(() => ({
    events,
    categories: catalog?.categories || [],
    departments: catalog?.departments || [],
    clubs: catalog?.clubs || [],
    venues: catalog?.venues || [],
    categoryNames: (catalog?.categories || []).filter((c) => c.is_active).map((c) => c.name),
    departmentNames: (catalog?.departments || []).filter((d) => d.is_active).map((d) => d.name),
    getEvent: (id) => events.find((e) => e.id === id),
    loading, error, refresh,
  }), [catalog, events, loading, error, refresh]);
}

export const useDataStatus = () => {
  const { loading, error, refresh, catalog } = useData();
  return { loading: loading && !catalog, error: catalog ? '' : error, refreshError: catalog ? error : '', refresh };
};

export const useStudentContext = () => {
  const { studentData, loading, error, refresh } = useData();
  return { data: studentData, loading, error, refresh };
};
export const useCampusContext = () => {
  const { campusData, loading, error, refresh } = useData();
  return { data: campusData, loading, error, refresh };
};
