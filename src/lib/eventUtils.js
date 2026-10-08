// Pure helpers for working with lists of events (the lists come from Supabase through the data context).

// The public label worked out from the live event stage (see adaptEvent):
// Open | Upcoming (registration not open yet) | Closed | Full | Completed | Cancelled
export function getEventStatus(event) {
  return event.status;
}

// Finished events (completed or cancelled) are not "upcoming"
export const isFinished = (event) => event.status === 'Completed' || event.status === 'Cancelled';

export function getRemainingSeats(event) {
  return Math.max(event.capacity - event.registered, 0);
}

// Case-insensitive search over title, category, organizer, department, venue and department code
export function eventMatchesSearch(event, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const text = [event.title, event.category, event.organizer, event.department, event.departmentCode, event.venue]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((word) => text.includes(word));
}

export function sortEvents(list, sortKey) {
  const sorted = [...list];
  switch (sortKey) {
    case 'date-desc': return sorted.sort((a, b) => b.date.localeCompare(a.date));
    case 'name-asc': return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'name-desc': return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case 'date-asc': return sorted.sort((a, b) => a.date.localeCompare(b.date));
    default: {
      // Upcoming events first (soonest first), then finished events (most recent first)
      const upcoming = sorted.filter((e) => !isFinished(e)).sort((a, b) => a.date.localeCompare(b.date));
      const past = sorted.filter((e) => isFinished(e)).sort((a, b) => b.date.localeCompare(a.date));
      return upcoming.concat(past);
    }
  }
}

export function getUpcomingEvents(list, limit) {
  const upcoming = list.filter((e) => !isFinished(e)).sort((a, b) => a.date.localeCompare(b.date));
  return limit ? upcoming.slice(0, limit) : upcoming;
}

// Same category first, then other upcoming events, never the current one
export function getRelatedEvents(list, event, limit = 3) {
  const others = list.filter((e) => e.id !== event.id && !isFinished(e));
  const same = others.filter((e) => e.category === event.category);
  const rest = others.filter((e) => e.category !== event.category);
  return sortEvents(same, 'date-asc').concat(sortEvents(rest, 'date-asc')).slice(0, limit);
}

export function countEventsByOrganizer(list, organizer) {
  return list.filter((e) => e.organizer === organizer).length;
}
