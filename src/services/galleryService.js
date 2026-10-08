import { supabase } from '../lib/supabase';
import { unwrap, friendlyError } from '../lib/errors';
import { uploadImage } from './storageService';
import { GALLERY_MAX_BYTES, GALLERY_TYPES } from '../lib/constants';

const BUCKET = 'event-gallery';
const PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/`;

// Public read: the policy returns photos of published events only (anonymous visitors included).
export async function fetchGallery(eventId) {
  return unwrap(
    await supabase.from('event_gallery').select('id, image_url, caption, uploaded_by, created_at, storage_path').eq('event_id', eventId).order('created_at', { ascending: false }),
    'Could not load the photos.',
  );
}

// Same limits as the storage bucket (5 MB; JPEG, PNG or WebP). The bucket enforces them again on the server.
export function checkGalleryFile(file) {
  if (!GALLERY_TYPES.includes(file.type)) return `${file.name}: only JPEG, PNG or WebP images are allowed.`;
  if (file.size > GALLERY_MAX_BYTES) return `${file.name}: the image is larger than 5 MB.`;
  if (file.size === 0) return `${file.name}: the file is empty.`;
  return '';
}

// Uploads the file to <bucket>/<user id>/..., then records it. If recording fails the uploaded file is removed again.
export async function addGalleryPhoto(eventId, userId, file, caption) {
  const problem = checkGalleryFile(file);
  if (problem) throw new Error(problem);
  const url = await uploadImage(BUCKET, userId, file);
  const storagePath = decodeURIComponent(new URL(url).pathname.split(PUBLIC_PREFIX)[1] || '');
  const { error } = await supabase.from('event_gallery').insert({ event_id: eventId, image_url: url, storage_path: storagePath, caption: (caption || '').trim() || null });
  if (error) {
    if (storagePath) await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(friendlyError(error, 'The photo could not be saved.'));
  }
}

// Removes the record (policy: event owner or admin) and then the file when the signed-in user may delete it.
export async function removeGalleryPhoto(photo) {
  unwrap(await supabase.from('event_gallery').delete().eq('id', photo.id), 'Could not remove the photo.');
  if (photo.storage_path) {
    // Storage policy: only the uploader (own folder) or an organiser may delete the file; ignore a refusal, the record is already gone.
    await supabase.storage.from(BUCKET).remove([photo.storage_path]);
  }
}

export async function updateGalleryCaption(id, caption) {
  unwrap(await supabase.from('event_gallery').update({ caption: (caption || '').trim() || null }).eq('id', id), 'Could not save the caption.');
}
