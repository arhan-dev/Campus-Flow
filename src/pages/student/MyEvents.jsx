import { useState } from 'react';
import { CalendarX } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Tabs from '../../components/Tabs';
import EmptyState from '../../components/EmptyState';
import StudentEventList from '../../components/StudentEventList';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';
import useStudentData from '../../hooks/useStudentData';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/DataContext';
import { cancelRegistration } from '../../services/studentService';
import { formatDate } from '../../lib/dates';

const TABS = ['Upcoming', 'Registered', 'Completed', 'Cancelled'];
const EMPTY = {
  Upcoming: { title: 'No upcoming events', text: "You haven't registered for any upcoming events yet." },
  Registered: { title: 'No registered events', text: "You haven't registered for any events yet." },
  Completed: { title: 'No completed events', text: 'Events you finish will show up here.' },
  Cancelled: { title: 'No cancelled registrations', text: 'Registrations you cancel, and events that were cancelled, are listed here.' },
};

export default function MyEvents() {
  const { registrations, upcoming, completed, cancelledRegistrations, attendedIds, refresh } = useStudentData();
  const { refresh: refreshCatalog } = useCatalog();
  const { profile } = useAuth();
  const [tab, setTab] = useState('Upcoming');
  const [cancelling, setCancelling] = useState(null); // the event the student is about to cancel
  const [busy, setBusy] = useState(false);
  const [toast, showToast, closeToast] = useToast();

  // Writes the cancellation to Supabase; the message appears only after the database accepted it
  const confirmCancel = async () => {
    setBusy(true);
    try {
      await cancelRegistration(cancelling.id, profile.id);
      await Promise.all([refresh(), refreshCatalog()]);
      setCancelling(null);
      showToast('Your registration was cancelled.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const lists = { Upcoming: upcoming, Registered: registrations, Completed: completed, Cancelled: cancelledRegistrations };
  const list = lists[tab];

  return (
    <div className="dash-page">
      <PageHeader
        title="My Events"
        text="Track the events you've registered for and your participation history."
        crumb="My Events"
      />
      <section className="card panel">
        <div className="panel-head">
          <Tabs tabs={TABS} active={tab} onChange={setTab} label="My events" />
          <span className="panel-sub">{list.length} {list.length === 1 ? 'event' : 'events'}</span>
        </div>
        {list.length > 0 ? (
          <StudentEventList registrations={list} attendedIds={attendedIds} onCancel={tab === 'Cancelled' ? undefined : setCancelling} />
        ) : (
          <EmptyState icon={CalendarX} {...EMPTY[tab]} actionLabel="Explore Events" actionTo="/student/events" />
        )}
      </section>

      <Modal
        open={Boolean(cancelling)}
        title="Cancel registration?"
        onClose={() => !busy && setCancelling(null)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setCancelling(null)} disabled={busy}>Keep my seat</Button>
            <Button variant="danger" onClick={confirmCancel} disabled={busy}>{busy ? 'Cancelling...' : 'Cancel registration'}</Button>
          </>
        )}
      >
        {cancelling && <p>You will give up your seat for <strong>{cancelling.title}</strong> on {formatDate(cancelling.date)}. You can register again later if seats are still available.</p>}
      </Modal>
      <Toast message={toast} onDone={closeToast} />
    </div>
  );
}
