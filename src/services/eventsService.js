import { supabase } from '../lib/supabase';
import { unwrap } from '../lib/errors';
import { LIFECYCLE_TO_DB } from '../lib/constants';
import { eventToRow, joinRejection } from './adapters';

// Organiser: creates a draft or submits it for approval. The database forces organizer_id to the signed-in user
// and rejects any other status, so these values cannot be faked from the browser.
export async function createEvent(fields, lookups, kind) {
  const row = {
    ...eventToRow(fields, lookups),
    status: kind === 'submit' ? 'approved' : 'draft',
  };
  const data = unwrap(await supabase.from('events').insert(row).select('id').single(), 'Could not create the event.');
  return data.id;
}

export async function updateEvent(id, fields, lookups, { submit = false } = {}) {
  const row = eventToRow(fields, lookups);
  if (submit) row.status = 'approved';
  unwrap(await supabase.from('events').update(row).eq('id', id), 'Could not save the changes.');
}

export async function submitForApproval(id) {
  unwrap(await supabase.from('events').update({ status: 'approved' }).eq('id', id), 'Could not publish the event.');
}

// Organiser action (enforced by the database): approved_by and approved_at are filled in by a trigger.
export async function approveEvent(id) {
  unwrap(await supabase.from('events').update({ status: LIFECYCLE_TO_DB.Approved }).eq('id', id), 'Could not approve the event.');
}

export async function rejectEvent(id, reason, note) {
  const text = joinRejection(reason, note);
  unwrap(await supabase.from('events').update({ status: LIFECYCLE_TO_DB.Rejected, rejection_reason: text }).eq('id', id), 'Could not reject the event.');
}

// Organiser (enforced by the database). The event is kept, its status becomes 'cancelled', registrations and
// attendance history stay, and everyone registered is notified by a database trigger. A reason is required.
export async function cancelEvent(id, reason) {
  const text = (reason || '').trim();
  if (!text) throw new Error('Enter a reason for the cancellation.');
  unwrap(await supabase.from('events').update({ status: LIFECYCLE_TO_DB.Cancelled, cancellation_reason: text }).eq('id', id), 'Could not cancel the event.');
}

// Asks the database to write the stage the dates dictate into events.status. Safe to call by anyone and idempotent.
// Registration never depends on this call: the database checks the live stage itself.
export async function syncLifecycle() {
  const { error } = await supabase.rpc('sync_event_lifecycle');
  return !error;
}
