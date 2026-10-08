import { useMemo } from 'react';
import { useCampusContext } from '../context/DataContext';
import { buildCampusData } from '../data/campusSelectors';

// Faculty and admin data from Supabase. Row level security decides what each role receives.
const EMPTY = buildCampusData(null, null);

export default function useCampusData() {
  const { data, loading, error, refresh } = useCampusContext();
  return useMemo(() => ({ ...(data || EMPTY), loading, error, refresh }), [data, loading, error, refresh]);
}
