import { useMemo, useState } from 'react';
import { GitBranch, Plus, Pencil, Check, X, Power, RefreshCw } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Field from '../../components/manage/Field';
import useToast from '../../hooks/useToast';
import Toast from '../../components/Toast';
import { useCatalog } from '../../context/DataContext';
import { createBranch, updateBranch, setBranchActive } from '../../services/campusService';

export default function OrganizerBranches() {
  const { departments, refresh, loading } = useCatalog();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, showToast, closeToast] = useToast();
  const branches = useMemo(() => [...departments].sort((a, b) => a.name.localeCompare(b.name)), [departments]);

  async function addBranch(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const generatedCode = code.trim() || name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      await createBranch({ name, code: generatedCode });
      setName('');
      setCode('');
      await refresh();
      showToast('Branch added successfully.');
    } catch (err) {
      showToast(err.message || 'Could not add branch.', 'error');
    } finally { setBusy(false); }
  }

  async function saveRename(id) {
    if (!editingName.trim()) return;
    setBusy(true);
    try {
      await updateBranch(id, { name: editingName });
      setEditingId(null);
      setEditingName('');
      await refresh();
      showToast('Branch name updated. Existing event restrictions were updated too.');
    } catch (err) {
      showToast(err.message || 'Could not rename branch.', 'error');
    } finally { setBusy(false); }
  }

  async function toggleBranch(branch) {
    const action = branch.is_active ? 'deactivate' : 'reactivate';
    if (branch.is_active && !window.confirm(`Deactivate "${branch.name}"? It will no longer be offered for new events or registrations. Existing records will be kept.`)) return;
    setBusy(true);
    try {
      await setBranchActive(branch.id, !branch.is_active);
      await refresh();
      showToast(`Branch ${branch.is_active ? 'deactivated' : 'reactivated'}.`);
    } catch (err) {
      showToast(err.message || `Could not ${action} branch.`, 'error');
    } finally { setBusy(false); }
  }

  return (
    <div className="dash-page">
      <PageHeader homePath="/organizer/dashboard" title="Manage branches" text="Add, rename, or deactivate the branches students can select when registering for events." crumb="Branches" />
      <Toast message={toast} onDone={closeToast} />
      <section className="card panel branch-create-panel">
        <div className="panel-head">
          <div><h2>Add a branch</h2><p className="panel-sub">New branches become available in event eligibility and student registration forms.</p></div>
        </div>
        <form onSubmit={addBranch} className="branch-create-form">
          <Field id="branch-name" label="Branch name" required>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Computer Science Engineering" required />
          </Field>
          <Field id="branch-code" label="Branch code" hint="Optional; generated from the name if left blank.">
            <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} placeholder="e.g. CSE" />
          </Field>
          <Button type="submit" icon={Plus} disabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Add branch'}</Button>
        </form>
      </section>

      <section className="card panel">
        <div className="panel-head">
          <div><h2>Available branches</h2><p className="panel-sub">{branches.filter((b) => b.is_active).length} active · {branches.length} total</p></div>
          <Button variant="outline" icon={RefreshCw} onClick={refresh} disabled={loading || busy}>Refresh</Button>
        </div>
        {branches.length === 0 ? <p className="panel-sub">No branches yet. Add your first branch above.</p> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Branch</th><th>Code</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id}>
                    <td data-label="Branch">
                      {editingId === branch.id
                        ? <input aria-label={`Rename ${branch.name}`} value={editingName} onChange={(e) => setEditingName(e.target.value)} maxLength={100} autoFocus />
                        : <strong>{branch.name}</strong>}
                    </td>
                    <td data-label="Code">{branch.code}</td>
                    <td data-label="Status"><Badge variant={branch.is_active ? 'active' : 'inactive'}>{branch.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    <td data-label="Actions"><div className="table-actions">
                      {editingId === branch.id ? <>
                        <Button size="sm" icon={Check} disabled={busy || !editingName.trim()} onClick={() => saveRename(branch.id)}>Save</Button>
                        <Button size="sm" variant="ghost" icon={X} disabled={busy} onClick={() => { setEditingId(null); setEditingName(''); }}>Cancel</Button>
                      </> : <>
                        <Button size="sm" variant="outline" icon={Pencil} disabled={busy} onClick={() => { setEditingId(branch.id); setEditingName(branch.name); }}>Edit</Button>
                        <Button size="sm" variant={branch.is_active ? 'ghost' : 'outline'} icon={Power} disabled={busy} onClick={() => toggleBranch(branch)}>{branch.is_active ? 'Deactivate' : 'Reactivate'}</Button>
                      </>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="panel-sub branch-footnote">Branches are deactivated rather than deleted so existing student profiles, registrations, and reports remain intact.</p>
      </section>
    </div>
  );
}
