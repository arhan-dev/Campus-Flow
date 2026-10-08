import { useMemo } from 'react';
import { useStudentContext } from '../context/DataContext';
import { buildStudentData } from '../data/campusSelectors';

// The signed-in student's data from Supabase (registrations, attendance, certificates, points, feedback, notifications).
// While the first load is running the lists are empty; the dashboard layout shows a loading screen meanwhile.
const EMPTY = buildStudentData(null, [], null);

export default function useStudentData() {
  const { data, loading, error, refresh } = useStudentContext();
  return useMemo(() => ({ ...(data || EMPTY), loading, error, refresh }), [data, loading, error, refresh]);
}
