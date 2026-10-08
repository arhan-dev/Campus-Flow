import { useState } from 'react';
import { Layers, Plus, Pencil, Power } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Toast from '../../components/Toast';
import Modal from '../../components/Modal';
import Field from '../../components/manage/Field';
import EmptyState from '../../components/EmptyState';
import useToast from '../../hooks/useToast';
import useCampusData from '../../hooks/useCampusData';
import { useCatalog } from '../../context/DataContext';
import { createClub, updateClub, setClubActive } from '../../services/campusService';

export default function Clubs() {
  const { clubs, refresh } = useCampusData();
  const { departments } = useCatalog();
  const [toast, showToast, closeToast] = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', description: '', departmentId: '' });
  const [errors, setErrors] = useState({});

  const startCreate = () => {
    setEditing(null);
    setForm({ name: '', category: '', description: '', departmentId: '' });
    setErrors({});
    setOpen(true);
  };

  const startEdit = (club) => {
    setEditing(club);
    setForm({ name: club.name, category: club.category === '-' ? '' : club.category, description: club.description || '', departmentId: club.departmentId || '' });
    setErrors({});
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (form.name.trim().length < 2) nextErrors.name = 'Enter a club name.';
    if (form.category.trim().length < 2) nextErrors.category = 'Enter a category.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    try {
      if (editing) await updateClub(editing.id, form);
      else await createClub(form);
      await refresh();
      setOpen(false);
      showToast(editing ? 'Club updated.' : 'Club created.');
    } catch (e2) {
      showToast(e2.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (club) => {
    try {
      await setClubActive(club.id, club.status !== 'Active');
      await refresh();
      showToast(`${club.name} ${club.status === 'Active' ? 'deactivated' : 'activated'}.`);
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  return (
    <div className="dash-page">
      <PageHeader
        homePath="/organizer/dashboard"
        title="Clubs & communities"
        text="Create, update and manage the campus communities behind your events."
        crumb="Clubs"
        action={<Button icon={Plus} onClick={startCreate}>Create club</Button>}
      />

      {clubs.length === 0 ? (
        <section className="card panel">
          <EmptyState icon={Layers} title="No clubs yet" text="Create the first campus club or committee." actionLabel="Create club" onAction={startCreate} />
        </section>
      ) : (
        <section className="card panel" aria-label="Club list">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Club</th><th>Category</th><th>Events</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {clubs.map((club) => (
                  <tr key={club.id}>
                    <td data-label="Club"><strong>{club.name}</strong></td>
                    <td data-label="Category"><Badge variant={String(club.category).toLowerCase()}>{club.category}</Badge></td>
                    <td data-label="Events">{club.eventCount}</td>
                    <td data-label="Status"><span className={`status-pill ${club.status === 'Active' ? 'status-success' : 'status-muted'}`}>{club.status}</span></td>
                    <td data-label="Actions">
                      <div className="table-actions">
                        <Button size="sm" variant="outline" icon={Pencil} onClick={() => startEdit(club)}>Edit</Button>
                        <Button size="sm" variant="ghost" icon={Power} onClick={() => toggle(club)}>{club.status === 'Active' ? 'Deactivate' : 'Activate'}</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Modal
        open={open}
        title={editing ? 'Edit club' : 'Create club'}
        onClose={() => !busy && setOpen(false)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Create club'}</Button>
          </>
        )}
      >
        <form onSubmit={save} className="profile-form" noValidate>
          <Field id="club-name" label="Club name" required error={errors.name}>
            <input id="club-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field id="club-category" label="Category" required error={errors.category}>
            <input id="club-category" placeholder="Technology, Cultural, Sports..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </Field>
          <Field id="club-description" label="Description">
            <textarea id="club-description" rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field id="club-department" label="Department">
            <select id="club-department" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">No department</option>
              {departments.filter((d) => d.is_active).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <button type="submit" className="visually-hidden">Save club</button>
        </form>
      </Modal>
      <Toast message={toast} onDone={closeToast} />
    </div>
  );
}
