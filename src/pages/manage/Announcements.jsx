import { useMemo, useState } from 'react';
import { Megaphone, Send, Archive, Trash2, FileText } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Toast from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import Field from '../../components/manage/Field';
import InfoNote from '../../components/manage/InfoNote';
import useToast from '../../hooks/useToast';
import useCampusData from '../../hooks/useCampusData';
import { useAuth } from '../../context/AuthContext';
import { createAnnouncement, setAnnouncementStatus, deleteAnnouncement } from '../../services/campusService';
import { AUDIENCES, AUDIENCE_HINTS } from '../../lib/constants';
import { formatDate } from '../../lib/dates';

const statusVariant = { Published: 'approved', Draft: 'pending', Archived: 'completed' };

// Shared by event organiser (announcements for their events) and admin (all announcements).
export default function AnnouncementsPage({ scope }) {
  const isOrganizer = scope === 'organizer';
  const data = useCampusData();
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const eventOptions = isOrganizer ? data.allEvents.filter((e) => !['Draft', 'Rejected'].includes(e.lifecycle)) : data.myEvents.filter((e) => !['Draft', 'Rejected', 'Pending Approval'].includes(e.lifecycle));
  const [form, setForm] = useState({ title: '', message: '', eventId: '', audience: 'Registered Participants' });
  const [errors, setErrors] = useState({});
  const [toast, showToast, closeToast] = useToast();

  // Event Organiser see announcements they wrote or that are about their events (the database already limits this)
  const list = useMemo(() => data.announcements, [data.announcements]);
  const run = async (action, message) => {
    try { await action(); await data.refresh(); showToast(message); } catch (e) { showToast(e.message, 'error'); }
  };

  const set = (key, value) => { setForm((f) => ({ ...f, [key]: value })); setErrors((e) => ({ ...e, [key]: undefined })); };
  const needsEvent = form.audience !== 'All Students';

  const submit = async (status) => {
    const found = {};
    if (!form.title.trim()) found.title = 'Enter a title.';
    if (form.message.trim().length < 10) found.message = 'Write a message of at least 10 characters.';
    if (needsEvent && !form.eventId) found.eventId = 'Choose the event this announcement is about.';
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = ['title', 'message', 'eventId'].find((k) => found[k]);
      requestAnimationFrame(() => document.getElementById(`an-${first}`)?.focus());
      return;
    }
    setBusy(true);
    try {
      await createAnnouncement({ title: form.title.trim(), message: form.message.trim(), audience: form.audience, eventId: needsEvent || form.eventId ? form.eventId : null, status }, profile.id);
      await data.refresh();
      setForm({ title: '', message: '', eventId: '', audience: form.audience });
      showToast(status === 'Published' ? 'Announcement published.' : 'Draft saved.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dash-page">
      <PageHeader
        homePath={`/${scope}/dashboard`}
        title="Announcements"
        text={isOrganizer ? 'Create and manage announcements for the campus.' : 'Send updates to students about your events.'}
        crumb="Announcements"
      />
      <InfoNote>Announcements create in-app notifications for the audience. Email and push delivery are planned for a later phase.</InfoNote>

      <div className="announce-layout">
        <section className="card panel" aria-labelledby="new-announcement">
          <h2 id="new-announcement">New announcement</h2>
          <form className="profile-form" noValidate onSubmit={(e) => { e.preventDefault(); submit('Published'); }}>
            <Field id="an-title" label="Title" required error={errors.title}>
              <input type="text" maxLength={100} value={form.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <Field id="an-message" label="Message" required error={errors.message} hint={`${form.message.trim().length}/500 characters`}>
              <textarea rows={4} maxLength={500} value={form.message} onChange={(e) => set('message', e.target.value)} />
            </Field>
            <Field id="an-audience" label="Audience" hint={AUDIENCE_HINTS[form.audience]}>
              <select value={form.audience} onChange={(e) => set('audience', e.target.value)}>
                {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field id="an-eventId" label="Event" required={needsEvent} error={errors.eventId}>
              <select value={form.eventId} onChange={(e) => set('eventId', e.target.value)}>
                <option value="">{needsEvent ? 'Choose an event' : 'No specific event'}</option>
                {eventOptions.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
              </select>
            </Field>
            <div className="head-actions">
              <Button type="submit" icon={Send}>Publish</Button>
              <Button variant="outline" icon={FileText} onClick={() => submit('Draft')}>Save as draft</Button>
            </div>
          </form>
        </section>

        <section className="card panel" aria-labelledby="announcement-list">
          <h2 id="announcement-list">{isOrganizer ? 'All announcements' : 'Your announcements'}</h2>
          {list.length === 0 ? (
            <EmptyState icon={Megaphone} title="No announcements yet" text="Create the first one with the form." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Title</th><th>Audience</th><th>Event</th><th>Date</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id}>
                      <td data-label="Title"><strong>{a.title}</strong><p className="cell-note">{a.message}</p></td>
                      <td data-label="Audience">{a.audience}</td>
                      <td data-label="Event">{a.event ? a.event.title : 'All campus'}</td>
                      <td data-label="Date">{formatDate(a.date)}</td>
                      <td data-label="Status"><Badge variant={statusVariant[a.status] || 'neutral'}>{a.status}</Badge></td>
                      <td data-label="Actions">
                        <div className="table-actions">
                          {a.status === 'Draft' && <Button size="sm" variant="secondary" icon={Send} onClick={() => run(() => setAnnouncementStatus(a.id, 'Published'), 'Announcement published.')} aria-label={`Publish ${a.title}`}>Publish</Button>}
                          {a.status === 'Published' && <Button size="sm" variant="outline" icon={Archive} onClick={() => run(() => setAnnouncementStatus(a.id, 'Archived'), 'Announcement archived.')} aria-label={`Archive ${a.title}`}>Archive</Button>}
                          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => run(() => deleteAnnouncement(a.id), 'Announcement deleted.')} aria-label={`Delete ${a.title}`}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <Toast message={toast} onDone={closeToast} />
    </div>
  );
}
