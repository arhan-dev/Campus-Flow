import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';
import useStudentData from '../../hooks/useStudentData';
import { YEAR_OPTIONS } from '../../lib/constants';
import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/DataContext';
import { updateOwnProfile } from '../../services/profileService';
import { uploadAvatar } from '../../services/storageService';

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const { departments } = useCatalog();
  const { student, registrations, totalPoints, certificates } = useStudentData();
  const [form, setForm] = useState({ name: student.name, departmentId: student.departmentId || '', year: student.year || '', phone: student.phone || '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, showToast, closeToast] = useToast();

  const change = (key) => (e) => { setForm({ ...form, [key]: e.target.value }); setError(''); };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Please enter a name.'); return; }
    setBusy(true);
    try {
      await updateOwnProfile(profile.id, { name: form.name.trim(), departmentId: form.departmentId, year: form.year, phone: form.phone.trim() });
      await refreshProfile();
      showToast('Profile updated.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const changeAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { showToast('Choose a JPG, PNG or WebP image.', 'error'); return; }
    if (file.size > 2 * 1024 * 1024) { showToast('The image must be 2 MB or smaller.', 'error'); return; }
    try {
      const url = await uploadAvatar(profile.id, file);
      await updateOwnProfile(profile.id, { avatarUrl: url });
      await refreshProfile();
      showToast('Profile photo updated.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="dash-page">
      <PageHeader title="Profile" text="Your account details." crumb="Profile" />

      <div className="profile-layout">
        <section className="card panel profile-card" aria-label="Student summary">
          <Avatar name={student.name} size={72} src={student.avatarUrl} />
          <label className="link-btn avatar-upload" htmlFor="p-avatar">Change photo</label>
          <input id="p-avatar" type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={changeAvatar} />
          <h2>{student.name}</h2>
          <p className="panel-sub">{[student.department, student.year].filter(Boolean).join(', ')}</p>
          <dl className="profile-facts">
            <div><dt>Registered events</dt><dd>{registrations.length}</dd></div>
            <div><dt>Certificates</dt><dd>{certificates.length}</dd></div>
            <div><dt>Points</dt><dd>{totalPoints}</dd></div>
          </dl>
        </section>

        <section className="card panel" aria-labelledby="edit-heading">
          <h2 id="edit-heading">Edit details</h2>
          <form onSubmit={save} noValidate className="profile-form">
            <div className="field">
              <label htmlFor="p-name">Name</label>
              <input id="p-name" type="text" value={form.name} onChange={change('name')} autoComplete="name" />
            </div>
            <div className="form-two">
              <div className="field">
                <label htmlFor="p-dept">Department</label>
                <select id="p-dept" value={form.departmentId} onChange={change('departmentId')}>
                  <option value="">Not set</option>
                  {departments.filter((d) => d.is_active || d.id === form.departmentId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="p-year">Year</label>
                <select id="p-year" value={form.year} onChange={change('year')}>
                  <option value="">Not set</option>
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="form-two">
              <div className="field">
                <label htmlFor="p-email">Email</label>
                <input id="p-email" type="text" value={student.email} readOnly />
              </div>
              <div className="field">
                <label htmlFor="p-phone">Phone (optional)</label>
                <input id="p-phone" type="text" inputMode="tel" value={form.phone} onChange={change('phone')} autoComplete="tel" />
              </div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</Button>
          </form>
        </section>
      </div>
      <Toast message={toast} onDone={closeToast} />
    </div>
  );
}
