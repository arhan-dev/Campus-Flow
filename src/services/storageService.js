import { supabase } from '../lib/supabase';
import { friendlyError } from '../lib/errors';

const safeName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);

// Uploads an image into <bucket>/<user id>/<timestamp>-<name> and returns its public URL.
// The storage policies only allow a user to write inside their own folder.
export async function uploadImage(bucket, userId, file) {
  const path = `${userId}/${Date.now()}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(friendlyError(error, 'The image could not be uploaded.'));
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export const uploadPoster = (userId, file) => uploadImage('event-posters', userId, file);
export const uploadAvatar = (userId, file) => uploadImage('profile-images', userId, file);
