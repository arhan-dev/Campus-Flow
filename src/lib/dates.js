// Dates are plain "YYYY-MM-DD" strings and times are "HH:MM". Everything is formatted in UTC
// so a date never shifts by timezone.
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(`${String(iso).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function dateParts(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  return {
    day: d.toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'UTC' }),
    month: d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }),
  };
}

export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Whole days from today to a date (negative when the date is in the past)
export function daysFromToday(iso) {
  return Math.round((new Date(`${iso}T00:00:00Z`) - new Date(`${todayISO()}T00:00:00Z`)) / 86400000);
}

// "14:30:00" -> "2:30 PM"
export function timeTo12h(value) {
  if (!value) return '';
  const [h, m] = String(value).split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

// "2:30 PM" or "14:30:00" -> "14:30"
export function timeTo24h(value) {
  if (!value) return '';
  const m12 = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value);
  if (m12) {
    let h = Number(m12[1]) % 12;
    if (m12[3].toUpperCase() === 'PM') h += 12;
    return `${String(h).padStart(2, '0')}:${m12[2]}`;
  }
  return String(value).slice(0, 5);
}

export function timeAgo(iso) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return formatDate(String(iso).slice(0, 10));
}
