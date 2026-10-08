import { supabase } from '../lib/supabase';
import { unwrap } from '../lib/errors';

// A user can only update their own row, and the database blocks changes to role, status and email.
export async function updateOwnProfile(userId, { name, departmentId, year, phone, avatarUrl }) {
  const row = {};
  if (name !== undefined) row.full_name = name;
  if (departmentId !== undefined) row.department_id = departmentId || null;
  if (year !== undefined) row.year_of_study = year || null;
  if (phone !== undefined) row.phone = phone || null;
  if (avatarUrl !== undefined) row.avatar_url = avatarUrl || null;
  unwrap(await supabase.from('profiles').update(row).eq('id', userId), 'Could not save your profile.');
}

export async function markNotificationsRead(ids) {
  if (!ids.length) return;
  unwrap(await supabase.from('notifications').update({ is_read: true }).in('id', ids), 'Could not update your notifications.');
}

export async function deleteNotifications(ids) {
  if (!ids.length) return;
  unwrap(await supabase.from('notifications').delete().in('id', ids), 'Could not clear your notifications.');
}
