import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { CalendarDays, Eye, Pencil, ClipboardList, Ban } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import Toast from '../../components/Toast';
import LifecycleBadge from '../../components/manage/LifecycleBadge';
import FilterBar, { FilterSelect } from '../../components/manage/FilterBar';
import EventPreviewModal from '../../components/manage/EventPreviewModal';
import CancelEventModal, { canCancel } from '../../components/manage/CancelEventModal';
import useToast from '../../hooks/useToast';
import useCampusData from '../../hooks/useCampusData';
import { LIFECYCLE } from '../../lib/constants';
import { formatDate } from '../../lib/dates';
import { useCatalog } from '../../context/DataContext';

export default function OrganizerEvents() {
  const { categoryNames: CATEGORY_LIST } = useCatalog();
  const { myEvents, refresh } = useCampusData();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [search, setSearch] = useState(params.get('q') || '');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [previewId, setPreviewId] = useState(location.state?.preview ?? null);
  const [cancelId, setCancelId] = useState(null);
  const [toast, showToast, closeToast] = useToast();
  const closePreview = useCallback(() => setPreviewId(null), []);

  // The top bar search sends people here with ?q=
  useEffect(() => { setSearch(params.get('q') || ''); }, [params]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myEvents.filter((e) => (
      (!q || [e.title, e.venue, e.category, e.organizer].join(' ').toLowerCase().includes(q))
      && (!status || e.lifecycle === status)
      && (!category || e.category === category)
    ));
  }, [myEvents, search, status, category]);

  const previewEvent = myEvents.find((e) => e.id === previewId);
  const clear = () => { setSearch(''); setStatus(''); setCategory(''); if (params.get('q')) setParams({}); };


  return (
    <div className="dash-page">
      <PageHeader
        homePath="/organizer/dashboard"
        title="Events"
        text="Create, publish and manage every campus event."
        crumb="Events"
        action={<Button to="/organizer/events/create">Create event</Button>}
      />

      <FilterBar search={search} onSearch={setSearch} placeholder="Search by title, venue or category" searchLabel="Search my events" canClear={Boolean(search || status || category)} onClear={clear}>
        <FilterSelect id="fe-status" label="Status" value={status} onChange={setStatus} options={LIFECYCLE} allLabel="All statuses" />
        <FilterSelect id="fe-category" label="Category" value={category} onChange={setCategory} options={CATEGORY_LIST} allLabel="All categories" />
      </FilterBar>

      <section className="card panel" aria-label="Event list">
        <p className="result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'event' : 'events'}</p>
        {myEvents.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No events yet" text="Create your first event. It can be published when ready." actionLabel="Create event" actionTo="/organizer/events/create" />
        ) : filtered.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No events match" text="Try a different search or clear the filters." actionLabel="Clear filters" onAction={clear} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Event</th><th>Category</th><th>Date</th><th>Venue</th><th>Status</th><th>Registrations</th><th>Capacity</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td data-label="Event">
                      <button type="button" className="link-title" onClick={() => setPreviewId(e.id)}>{e.title}</button>
                      {e.lifecycle === 'Cancelled' && e.cancellationReason && <p className="cell-note">Cancelled: {e.cancellationReason}</p>}
                      {e.lifecycle === 'Rejected' && e.rejectionReason && <p className="cell-note">Rejected: {e.rejectionReason}</p>}
                    </td>
                    <td data-label="Category"><Badge variant={e.category.toLowerCase()}>{e.category}</Badge></td>
                    <td data-label="Date">{formatDate(e.date)}</td>
                    <td data-label="Venue">{e.venue}</td>
                    <td data-label="Status"><LifecycleBadge status={e.lifecycle} /></td>
                    <td data-label="Registrations">{e.registered}</td>
                    <td data-label="Capacity">{e.capacity}</td>
                    <td data-label="Actions">
                      <div className="table-actions">
                        <Button size="sm" variant="outline" icon={Eye} onClick={() => setPreviewId(e.id)} aria-label={`View ${e.title}`}>View</Button>
                        {!['Completed', 'Cancelled'].includes(e.lifecycle) && <Button size="sm" variant="outline" icon={Pencil} to={`/organizer/events/${e.id}/edit`} aria-label={`Edit ${e.title}`}>Edit</Button>}
                        {!['Draft', 'Pending Approval', 'Rejected'].includes(e.lifecycle) && (
                          <Button size="sm" variant="ghost" icon={ClipboardList} to={`/organizer/registrations?event=${e.id}`} aria-label={`Manage registrations for ${e.title}`}>Registrations</Button>
                        )}
                        {canCancel(e) && <Button size="sm" variant="danger" icon={Ban} onClick={() => setCancelId(e.id)} aria-label={`Cancel ${e.title}`}>Cancel</Button>}
                        {e.lifecycle === 'Draft'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {cancelId && myEvents.find((e) => e.id === cancelId) && <CancelEventModal event={myEvents.find((e) => e.id === cancelId)} onClose={() => setCancelId(null)} onDone={async () => { await refresh(); showToast('Event cancelled. Registered students were notified.'); }} />}
      {previewEvent && <EventPreviewModal event={previewEvent} onClose={closePreview} />}
      <Toast message={toast} onDone={closeToast} />
    </div>
  );
}
