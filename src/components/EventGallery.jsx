import { useEffect, useState } from 'react';
import { Images } from 'lucide-react';
import Modal from './Modal';
import { fetchGallery } from '../services/galleryService';

// Read-only gallery on the public event page. The database policy only returns photos of published events.
export default function EventGallery({ eventId }) {
  const [photos, setPhotos] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  useEffect(() => {
    let active = true;
    fetchGallery(eventId).then((rows) => active && setPhotos(rows)).catch((e) => active && setError(e.message));
    return () => { active = false; };
  }, [eventId]);

  if (error) return <article className="details-block"><h2>Event gallery</h2><p className="form-error" role="alert">{error}</p></article>;
  if (!photos || photos.length === 0) return null;
  return (
    <article className="details-block">
      <h2><Images size={20} aria-hidden="true" /> Event gallery</h2>
      <ul className="gallery-grid">
        {photos.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => setOpen(p)} aria-label={p.caption ? `Open photo: ${p.caption}` : 'Open photo'}>
              <img src={p.image_url} alt={p.caption || 'Event photo'} loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
      <Modal open={Boolean(open)} title={open?.caption || 'Event photo'} size="lg" onClose={() => setOpen(null)}>
        {open && <img className="gallery-large" src={open.image_url} alt={open.caption || 'Event photo'} />}
      </Modal>
    </article>
  );
}
