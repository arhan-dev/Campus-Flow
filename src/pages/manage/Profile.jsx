import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import Toast from '../../components/Toast';
import Field from '../../components/manage/Field';
import useToast from '../../hooks/useToast';
import useCampusData from '../../hooks/useCampusData';
import { useCatalog } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { updateOwnProfile } from '../../services/profileService';
import { uploadAvatar } from '../../services/storageService';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ProfilePage({ scope }) {
  const { departments } = useCatalog();
  const { profile: me, refreshProfile } = useAuth();
  const isAdmin = false;
  const data = useCampusData();
  const profile = data.organizer;
  const [form, setForm] = useState({ name: profile.name, phone: profile.phone || '', departmentId: profile.departmentId || '' });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, showToast, closeToast] = useToast();

  const set = (key, value) => { setForm((f) => ({ ...f, [key]: value })); setErrors((e) => ({ ...e, [key]: undefined })); };

  const save = async (e) => {
    e.preventDefault();
    const found = {};
    if (!form.name.trim()) found.name = 'Enter your name.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      await updateOwnProfile(me.id, { name: form.name.trim(), phone: form.phone.trim(), departmentId: form.departmentId });
      await refreshProfile();
      await data.refresh();
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
      const url = await uploadAvatar(me.id, file);
      await updateOwnProfile(me.id, { avatarUrl: url });
      await refreshProfile();
      showToast('Profile photo updated.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="dash-page">
      <PageHeader homePath={`/${scope}/dashboard`} title="Profile" text="Your account details." crumb="Profile" />

      <div className="profile-layout">
        <section className="card panel profile-card" aria-label="Profile summary">
          <Avatar name={profile.name} size={72} src={profile.avatarUrl} />
          <label className="link-btn avatar-upload" htmlFor="pf-avatar">Change photo</label>
          <input id="pf-avatar" type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={changeAvatar} />
          <h2>{profile.name}</h2>
          <p className="panel-sub">{profile.roleTitle}</p>
          <p className="panel-sub">{isAdmin ? profile.office : `Department of ${profile.department}`}</p>
        </section>

        <div className="profile-stack">
          <section className="card panel">
            <h2>Edit details</h2>
            <form className="profile-form" onSubmit={save} noValidate>
              <Field id="pf-name" label="Name" required error={errors.name}>
                <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" />
              </Field>
              <Field id="pf-role" label="Role"><input type="text" value={profile.roleTitle} readOnly /></Field>
              {isAdmin ? (
                <Field id="pf-office" label="Office"><input type="text" value={profile.office} readOnly /></Field>
              ) : (
                <Field id="pf-dept" label="Department">
                  <select value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)}>
                    <option value="">Not set</option>
                    {departments.filter((d) => d.is_active || d.id === form.departmentId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </Field>
              )}
              <div className="form-two">
                <Field id="pf-email" label="Email" hint="Your login email. It cannot be changed here.">
                  <input type="email" value={profile.email} readOnly />
                </Field>
                <Field id="pf-phone" label="Phone" hint="Optional.">
                  <input type="text" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="off" />
                </Field>
              </div>
              <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</Button>
            </form>
          </section>

        </div>
      </div>
      <Toast message={toast} onDone={closeToast} />
    </div>
  );
}
