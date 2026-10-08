import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Images, Upload, Trash2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import InfoNote from '../../components/manage/InfoNote';
import useToast from '../../hooks/useToast';
import useCampusData from '../../hooks/useCampusData';
import { useAuth } from '../../context/AuthContext';
import { addGalleryPhoto, checkGalleryFile, fetchGallery, removeGalleryPhoto } from '../../services/galleryService';
import { formatDate } from '../../lib/dates';

const PUBLISHED = ['Approved', 'Registration Open', 'Registration Closed', 'Ongoing', 'Completed', 'Cancelled'];

// Event photos for event organiser (their own events) and event organiser (all events). Uploads go to the event-gallery bucket in the
// user's own folder; the database refuses photos for events that are not published and for other people's events.
export default function GalleryManager({ scope }) {
  const data = useCampusData();
  const { profile } = useAuth();
  const [toast, showToast, closeToast] = useToast();
  const home = `/${scope}/dashboard`;
  const options = useMemo(() => (scope === 'organizer' ? data.allEvents : data.myEvents).filter((e) => PUBLISHED.includes(e.lifecycle)).sort((a, b) => b.date.localeCompare(a.date)), [data, scope]);
  const [eventId, setEventId] = useState(null);
  const current = options.find((e) => e.id === eventId) || options[0] || null;
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    setLoadError('');
    try { setPhotos(await fetchGallery(current.id)); } catch (e) { setLoadError(e.message); } finally { setLoading(false); }
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const choose = (e) => {
    const picked = Array.from(e.target.files || []);
    const problems = picked.map(checkGalleryFile).filter(Boolean);
    if (problems.length) { showToast(problems[0], 'error'); setFiles([]); e.target.value = ''; return; }
    setFiles(picked.slice(0, 10));
    if (picked.length > 10) showToast('Only the first 10 photos were selected.', 'error');
  };

  const upload = async () => {
    setBusy(true);
    let done = 0;
    try {
      for (const file of files) { // one at a time so a failure stops cleanly and is reported
        await addGalleryPhoto(current.id, profile.id, file, files.length === 1 ? caption : '');
        done += 1;
      }
      showToast(`${done} ${done === 1 ? 'photo' : 'photos'} uploaded.`);
      setFiles([]); setCaption('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (e) {
      showToast(done ? `${done} uploaded, then: ${e.message}` : e.message, 'error');
    } finally {
      setBusy(false);
      load();
    }
  };

  const confirmRemove = async () => {
    setBusy(true);
    try { await removeGalleryPhoto(removing); showToast('Photo removed.'); setRemoving(null); await load(); } catch (e) { showToast(e.message, 'error'); } finally { setBusy(false); }
  };

  if (!current) {
    return (
      <div className="dash-page">
        <PageHeader homePath={home} title="Event gallery" crumb="Gallery" />
        <EmptyState icon={Images} title="No events to add photos to" text="Photos can be added once an event is approved." actionLabel="Go to events" actionTo={`/${scope}/events`} />
      </div>
    );
  }

  return (
    <div className="dash-page">
      <PageHeader homePath={home} title="Event gallery" text="Upload photos of your events. Published photos are shown on the public event page." crumb="Gallery" />
      <InfoNote>JPEG, PNG or WebP, up to 5 MB each, up to 60 photos per event. Photos are public once uploaded.</InfoNote>

      <section className="card panel" aria-label="Upload photos">
        <div className="form-two">
          <div className="field">
            <label htmlFor="gal-event">Event</label>
            <select id="gal-event" value={current.id} onChange={(e) => { setEventId(e.target.value); setFiles([]); }}>
              {options.map((e) => <option key={e.id} value={e.id}>{e.title} ({formatDate(e.date)})</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="gal-files">Photos</label>
            <input id="gal-files" ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={choose} />
          </div>
        </div>
        {files.length === 1 && (
          <div className="field">
            <label htmlFor="gal-caption">Caption (optional)</label>
            <input id="gal-caption" type="text" maxLength={200} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>
        )}
        <Button icon={Upload} onClick={upload} disabled={files.length === 0 || busy}>{busy ? 'Uploading...' : `Upload ${files.length || ''} ${files.length === 1 ? 'photo' : 'photos'}`.replace('  ', ' ')}</Button>
      </section>

      <section className="card panel" aria-label="Photos">
        <p className="result-count" aria-live="polite">{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</p>
        {loading && photos.length === 0 && <p className="panel-sub" role="status">Loading photos...</p>}
        {loadError && <p className="form-error" role="alert">{loadError}</p>}
        {!loading && !loadError && photos.length === 0 && <EmptyState icon={Images} title="No photos yet" text="Uploaded photos will appear here." />}
        {photos.length > 0 && (
          <ul className="gallery-grid gallery-manage">
            {photos.map((p) => (
              <li key={p.id}>
                <img src={p.image_url} alt={p.caption || 'Event photo'} loading="lazy" />
                {p.caption && <p className="gallery-caption">{p.caption}</p>}
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setRemoving(p)} aria-label={`Remove photo${p.caption ? `: ${p.caption}` : ''}`}>Remove</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={Boolean(removing)} title="Remove this photo?" onClose={() => !busy && setRemoving(null)} footer={(<><Button variant="ghost" onClick={() => setRemoving(null)} disabled={busy}>Keep</Button><Button variant="danger" onClick={confirmRemove} disabled={busy}>{busy ? 'Removing...' : 'Remove photo'}</Button></>)}>
        <p>The photo will be removed from the event page.</p>
      </Modal>
      <Toast message={toast} onDone={closeToast} />
    </div>
  );
}
