import { supabase } from '../lib/supabase';
import { unwrap } from '../lib/errors';
import { PUBLISHED_DB_STATUSES } from '../lib/constants';
import { EVENT_SELECT, adaptEvent } from './adapters';

// Reference data and published events. Anyone (even a visitor who is not logged in) may read these;
// the database policies decide what is visible.
export async function fetchCatalog() {
  const [events, seats, live, categories, departments, clubs, venues] = await Promise.all([
    supabase.from('events').select(EVENT_SELECT).in('status', PUBLISHED_DB_STATUSES).order('event_date'),
    supabase.from('event_seat_counts').select('event_id, registered_count'),
    supabase.from('event_live_status').select('event_id, live_status'),
    supabase.from('event_categories').select('id, name, description, icon, is_active').order('name'),
    supabase.from('departments').select('id, name, code, is_active').order('name'),
    supabase.from('clubs').select('id, name, category, is_active').order('name'),
    supabase.from('venues').select('id, name, capacity, status').order('name'),
  ]);
  const seatMap = new Map(unwrap(seats, 'Could not load seat counts.').map((s) => [s.event_id, s.registered_count]));
  const liveMap = new Map(unwrap(live, 'Could not load event status.').map((l) => [l.event_id, l.live_status]));
  return {
    events: unwrap(events, 'Could not load events.').map((row) => adaptEvent(row, seatMap.get(row.id) || 0, liveMap.get(row.id))),
    categories: unwrap(categories, 'Could not load categories.'),
    departments: unwrap(departments, 'Could not load departments.'),
    clubs: unwrap(clubs, 'Could not load clubs.'),
    venues: unwrap(venues, 'Could not load venues.'),
    seatMap,
  };
}
