import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Eye, Plus, Trash2, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import Toast from '../../components/Toast';
import ProgressBar from '../../components/ProgressBar';
import Field from '../../components/manage/Field';
import EventSummary from '../../components/manage/EventSummary';
import EventPreviewModal from '../../components/manage/EventPreviewModal';
import ConflictNotice from '../../components/manage/ConflictNotice';
import useToast from '../../hooks/useToast';
import useCampusData from '../../hooks/useCampusData';
import { useAuth } from '../../context/AuthContext';
import { createEvent, updateEvent } from '../../services/eventsService';
import { uploadPoster } from '../../services/storageService';
import { todayISO } from '../../lib/dates';
import { useCatalog } from '../../context/DataContext';
import { ACTIVE_LIFECYCLE } from '../../lib/constants';
import { timeTo12h as to12h, timeTo24h as to24h } from '../../lib/dates';

const STEPS = [
  { key: 'basic', label: 'Basic information', fields: ['title', 'category', 'description', 'department', 'organizer', 'contactEmail'] },
  { key: 'schedule', label: 'Schedule', fields: ['date', 'startTime', 'endTime'] },
  { key: 'venue', label: 'Venue & capacity', fields: ['venue', 'capacity'] },
  { key: 'registration', label: 'Registration', fields: ['registrationOpensOn', 'registrationDeadline'] },
  { key: 'rules', label: 'Rules & prizes', fields: [] },
  { key: 'media', label: 'Event media', fields: ['poster'] },
  { key: 'review', label: 'Review', fields: [] },
];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emptyValues = (organizer) => ({
  title: '', category: '', description: '', department: organizer.department || '', organizer: '',
  contactName: organizer.name, contactEmail: organizer.email, contactPhone: '',
  date: '', startTime: '', endTime: '', schedule: [{ time: '', activity: '' }],
  venue: '', capacity: '', registrationOpensOn: '', registrationDeadline: '', rules: [''], prizes: [''], posterName: '',
});

function fromEvent(e) {
  return {
    title: e.title, category: e.category, description: e.description, department: e.department, organizer: e.organizer,
    contactName: e.contactName || '', contactEmail: e.contactEmail || '', contactPhone: e.contactPhone || '',
    date: e.date, startTime: to24h(e.time), endTime: to24h(e.endTime),
    schedule: e.schedule?.length ? e.schedule.map(([time, activity]) => ({ time, activity })) : [{ time: '', activity: '' }],
    venue: e.venue, capacity: String(e.capacity), registrationOpensOn: e.registrationOpensOn || '', registrationDeadline: e.registrationDeadline,
    rules: e.rules?.length ? [...e.rules] : [''], prizes: e.prizes?.length ? [...e.prizes] : [''], posterName: e.posterName || '',
  };
}

// The event fields sent to Supabase (and shown in the preview)
function toEvent(v) {
  return {
    title: v.title.trim(), category: v.category, description: v.description.trim(), department: v.department, organizer: v.organizer,
    contactName: v.contactName.trim(), contactEmail: v.contactEmail.trim(), contactPhone: v.contactPhone.trim(),
    date: v.date, time: to12h(v.startTime), endTime: to12h(v.endTime),
    schedule: v.schedule.filter((r) => r.time.trim() || r.activity.trim()).map((r) => [r.time.trim(), r.activity.trim()]),
    venue: v.venue, capacity: Number(v.capacity) || 0, registrationOpensOn: v.registrationOpensOn, registrationDeadline: v.registrationDeadline,
    rules: v.rules.map((r) => r.trim()).filter(Boolean), prizes: v.prizes.map((r) => r.trim()).filter(Boolean), posterName: v.posterName,
  };
}

function validate(v, { isNew, registered }) {
  const e = {};
  if (!v.title.trim()) e.title = 'Enter an event title.';
  else if (v.title.trim().length < 3) e.title = 'The title needs at least 3 characters.';
  if (!v.category) e.category = 'Choose a category.';
  if (!v.description.trim()) e.description = 'Add a short description of the event.';
  else if (v.description.trim().length < 20) e.description = 'Write at least 20 characters so students know what to expect.';
  if (!v.department) e.department = 'Choose a department.';
  if (!v.organizer) e.organizer = 'Choose the organizer or club.';
  if (v.contactEmail.trim() && !EMAIL.test(v.contactEmail.trim())) e.contactEmail = 'Enter a valid email address, or leave it empty.';

  if (!v.date) e.date = 'Choose the event date.';
  else if (isNew && v.date < todayISO()) e.date = 'The event date cannot be in the past.';
  if (!v.startTime) e.startTime = 'Choose a start time.';
  if (!v.endTime) e.endTime = 'Choose an end time.';
  else if (v.startTime && v.endTime <= v.startTime) e.endTime = 'The end time must be after the start time.';

  if (!v.venue) e.venue = 'Choose a venue.';
  const capacity = Number(v.capacity);
  if (v.capacity === '') e.capacity = 'Enter the number of seats.';
  else if (!Number.isInteger(capacity) || capacity <= 0) e.capacity = 'Capacity must be a whole number greater than zero.';
  else if (capacity > 10000) e.capacity = 'Capacity looks too large. Enter 10,000 or fewer.';
  else if (registered && capacity < registered) e.capacity = `Capacity cannot be lower than the ${registered} students already registered.`;

  if (!v.registrationDeadline) e.registrationDeadline = 'Choose a registration deadline.';
  else if (v.date && v.registrationDeadline > v.date) e.registrationDeadline = 'The registration deadline cannot be after the event date.';
  else if (isNew && v.registrationDeadline < todayISO()) e.registrationDeadline = 'The registration deadline has already passed.';
  if (v.registrationOpensOn) {
    if (v.registrationDeadline && v.registrationOpensOn > v.registrationDeadline) e.registrationOpensOn = 'Registration cannot open after the deadline.';
    else if (v.date && v.registrationOpensOn > v.date) e.registrationOpensOn = 'Registration cannot open after the event date.';
  }
  return e;
}

// ---------- Small editors ----------
function ListEditor({ id, label, values, onChange, placeholder, addLabel }) {
  const update = (i, text) => onChange(values.map((v, idx) => (idx === i ? text : v)));
  return (
    <fieldset className="repeat-group">
      <legend>{label}</legend>
      {values.map((value, i) => (
        <div className="repeat-row" key={i}>
          <input type="text" id={`${id}-${i}`} value={value} placeholder={placeholder} aria-label={`${label} ${i + 1}`} onChange={(e) => update(i, e.target.value)} />
          <button type="button" className="icon-btn" aria-label={`Remove ${label.toLowerCase()} ${i + 1}`} disabled={values.length === 1 && !value}
            onClick={() => onChange(values.length === 1 ? [''] : values.filter((_, idx) => idx !== i))}>
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      ))}
      <Button variant="outline" size="sm" icon={Plus} onClick={() => onChange([...values, ''])}>{addLabel}</Button>
    </fieldset>
  );
}

function ScheduleEditor({ rows, onChange }) {
  const update = (i, key, text) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: text } : r)));
  return (
    <fieldset className="repeat-group">
      <legend>Programme</legend>
      <p className="field-hint">Optional. Add the main parts of the day, for example "10:00 AM" and "Opening talk".</p>
      {rows.map((row, i) => (
        <div className="repeat-row repeat-row-schedule" key={i}>
          <input type="text" value={row.time} placeholder="10:00 AM" aria-label={`Programme time ${i + 1}`} onChange={(e) => update(i, 'time', e.target.value)} />
          <input type="text" value={row.activity} placeholder="What happens" aria-label={`Programme activity ${i + 1}`} onChange={(e) => update(i, 'activity', e.target.value)} />
          <button type="button" className="icon-btn" aria-label={`Remove programme row ${i + 1}`} disabled={rows.length === 1 && !row.time && !row.activity}
            onClick={() => onChange(rows.length === 1 ? [{ time: '', activity: '' }] : rows.filter((_, idx) => idx !== i))}>
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      ))}
      <Button variant="outline" size="sm" icon={Plus} onClick={() => onChange([...rows, { time: '', activity: '' }])}>Add a row</Button>
    </fieldset>
  );
}

// ---------- Page ----------
// One form for creating and editing. scope "organizer" is the organizer's own area, "admin" can edit any event.
export default function EventForm({ scope = 'organizer' }) {
  const { profile } = useAuth();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const base = `/${scope}`;
  const data = useCampusData();
  const event = isEdit ? data.getEvent(id) : null;

  if (isEdit && !event) {
    return <EmptyState title="Event not found" text="This event does not exist or is not available to you." actionLabel="Back to events" actionTo={`${base}/events`} />;
  }
  if (event && ['Completed', 'Cancelled'].includes(event.lifecycle)) {
    return <EmptyState title="This event has ended" text="Completed and cancelled events can no longer be edited." actionLabel="Back to events" actionTo={`${base}/events`} />;
  }
  // The key resets the form when another event is opened
  return <EventFormContent key={id || 'new'} scope={scope} event={event} data={data} />;
}

function EventFormContent({ scope, event, data }) {
  const { categoryNames: CATEGORY_LIST, departmentNames: DEPARTMENTS, categories, departments, clubs, venues } = useCatalog();
  const { profile } = useAuth();
  const [posterFile, setPosterFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const isEdit = Boolean(event);
  const base = `/${scope}`;
  const [values, setValues] = useState(() => (event ? fromEvent(event) : emptyValues(data.organizer)));
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(isEdit ? STEPS.length - 1 : 0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [done, setDone] = useState(null); // { kind, id } after saving
  const [poster, setPoster] = useState({ url: event?.posterUrl || '', name: values.posterName });
  const [toast, showToast, closeToast] = useToast();
  const headingRef = useRef(null);

  useEffect(() => () => { if (poster.url && poster.url.startsWith('blob:')) URL.revokeObjectURL(poster.url); }, [poster.url]);
  useEffect(() => { headingRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [step]);

  const organizerOptions = useMemo(() => {
    const names = clubs.filter((c) => c.is_active).map((c) => c.name);
    return values.organizer && !names.includes(values.organizer) ? [values.organizer, ...names] : names;
  }, [clubs, values.organizer]);
  const venueOptions = useMemo(() => {
    const names = venues.map((v) => v.name);
    return values.venue && !names.includes(values.venue) ? [values.venue, ...names] : names;
  }, [venues, values.venue]);

  const ctx = { isNew: !isEdit, registered: event?.registered || 0 };
  const previewEvent = useMemo(() => ({
    ...toEvent(values), id: event?.id, posterUrl: poster.url, draftPreview: true, lifecycle: event?.lifecycle || 'Draft',
    image: (values.category || 'technical').toLowerCase(),
  }), [values, event]);

  // Warn (not block) when another active event uses the same venue on the same day
  const clashes = useMemo(() => (values.venue && values.date
    ? data.allEvents.filter((e) => e.id !== event?.id && e.venue === values.venue && e.date === values.date && ACTIVE_LIFECYCLE.includes(e.lifecycle))
    : []), [data.allEvents, values.venue, values.date, event]);

  const set = (key, value) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };
  const bind = (key) => ({ value: values[key], onChange: (e) => set(key, e.target.value) });

  const focusFirst = (errs) => {
    const first = Object.keys(errs).find((k) => errs[k]);
    if (first) requestAnimationFrame(() => document.getElementById(`ef-${first}`)?.focus());
  };

  const stepErrors = (index, all) => STEPS[index].fields.reduce((acc, f) => (all[f] ? { ...acc, [f]: all[f] } : acc), {});
  const goNext = () => {
    const all = { ...validate(values, ctx), ...(errors.poster ? { poster: errors.poster } : {}) };
    const here = stepErrors(step, all);
    if (Object.keys(here).length > 0) {
      setErrors((er) => ({ ...er, ...here }));
      focusFirst(here);
      return;
    }
    setStep(step + 1);
    setMaxStep((m) => Math.max(m, step + 1));
  };
  const onFormSubmit = (e) => {
    e.preventDefault();
    if (step < STEPS.length - 1) goNext();
  };

  const onPoster = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setErrors((er) => ({ ...er, poster: 'Choose an image file (JPG, PNG or WebP).' })); return; }
    if (file.size > 5 * 1024 * 1024) { setErrors((er) => ({ ...er, poster: 'Choose an image under 5 MB.' })); return; }
    if (poster.url && poster.url.startsWith('blob:')) URL.revokeObjectURL(poster.url);
    setPosterFile(file);
    setPoster({ url: URL.createObjectURL(file), name: file.name });
    set('posterName', file.name);
    setErrors((er) => ({ ...er, poster: undefined }));
  };

  const all = validate(values, ctx);
  const problemCount = Object.keys(all).length;

  // kind: 'draft' | 'submit' | 'save'. Everything is written to Supabase; the success message only appears after it worked.
  const save = async (kind) => {
    const found = validate(values, ctx);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const firstStep = STEPS.findIndex((s) => s.fields.some((f) => found[f]));
      setStep(Math.max(firstStep, 0));
      setMaxStep(STEPS.length - 1);
      focusFirst(found);
      return;
    }
    setSaving(true);
    try {
      const fields = toEvent(values);
      if (posterFile) fields.posterUrl = await uploadPoster(profile.id, posterFile);
      const lookups = { categories, departments, clubs, venues };
      if (!isEdit) {
        const newId = await createEvent(fields, lookups, kind === 'submit' ? 'submit' : 'draft');
        await data.refresh();
        showToast(kind === 'submit' ? 'Event published.' : 'Event saved as a draft.');
        setDone({ kind, id: newId });
        return;
      }
      await updateEvent(event.id, fields, lookups, { submit: kind === 'submit' });
      await data.refresh();
      showToast(kind === 'submit' ? 'Event republished.' : 'Changes saved.');
      if (kind === 'submit') setDone({ kind, id: event.id });
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="dash-page">
        <PageHeader homePath={`${base}/dashboard`} title={done.kind === 'submit' ? 'Event published' : 'Event saved as draft'} crumb={[{ label: 'Events', to: `${base}/events` }, { label: 'Saved' }]} />
        <div className="card panel success-panel">
          <CheckCircle2 size={40} aria-hidden="true" />
          <h2>{done.kind === 'submit' ? 'Event published.' : 'Event created as draft.'}</h2>
          <p>{done.kind === 'submit'
            ? 'The event is now available to students according to its registration dates.'
            : 'You can keep editing it and publish it when it is ready.'}</p>
          <div className="head-actions">
            <Button to={`${base}/events`}>Go to events</Button>
            {done.kind !== 'submit' && <Button variant="outline" to={`${base}/events/${done.id}/edit`}>Keep editing</Button>}
            {!isEdit && <Button variant="ghost" onClick={() => { setDone(null); setValues(emptyValues(data.organizer)); setStep(0); setMaxStep(0); setErrors({}); }}>Create another</Button>}
          </div>
        </div>
        <Toast message={toast} onDone={closeToast} />
      </div>
    );
  }

  const canPublish = true;
  const current = STEPS[step];

  return (
    <div className="dash-page">
      <PageHeader
        homePath={`${base}/dashboard`}
        title={isEdit ? 'Edit event' : 'Create event'}
        text={isEdit ? `Editing ${event.title}.` : 'Fill in the sections below. You can save a draft at any step.'}
        crumb={[{ label: 'Events', to: `${base}/events` }, { label: isEdit ? 'Edit' : 'Create' }]}
        action={<Button variant="outline" icon={Eye} onClick={() => setPreviewOpen(true)}>Preview Event</Button>}
      />

      {isEdit && event.lifecycle === 'Rejected' && (
        <div className="notice notice-danger" role="note">
          <div>
            <strong>Rejected: {event.rejectionReason}</strong>
            {event.rejectionNote && <p>{event.rejectionNote}</p>}
            <p>Update the event and publish the latest version when it is ready.</p>
          </div>
        </div>
      )}

      <form className="card form-card" onSubmit={onFormSubmit} noValidate>
        <nav aria-label="Form sections">
          <ol className="stepper">
            {STEPS.map((s, i) => (
              <li key={s.key}>
                <button type="button" className={`stepper-btn ${i === step ? 'is-current' : ''} ${i < step ? 'is-done' : ''}`}
                  aria-current={i === step ? 'step' : undefined} disabled={i > maxStep} onClick={() => setStep(i)}>
                  <span className="stepper-num" aria-hidden="true">{i < step ? <Check size={14} /> : i + 1}</span>
                  <span className="stepper-label">{s.label}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="stepper-mobile">
            <p>Step {step + 1} of {STEPS.length}: <strong>{current.label}</strong></p>
            <ProgressBar value={step + 1} max={STEPS.length} label="Form progress" highlightFull={false} />
          </div>
        </nav>

        <div className="form-section" ref={headingRef}>
          <h2>{current.label}</h2>

          {current.key === 'basic' && (
            <>
              <Field id="ef-title" label="Event title" required error={errors.title}>
                <input type="text" maxLength={80} {...bind('title')} />
              </Field>
              <div className="form-two">
                <Field id="ef-category" label="Category" required error={errors.category}>
                  <select {...bind('category')}>
                    <option value="">Choose a category</option>
                    {CATEGORY_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field id="ef-department" label="Department" required error={errors.department}>
                  <select {...bind('department')}>
                    <option value="">Choose a department</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
              </div>
              <Field id="ef-description" label="Description" required error={errors.description} hint={`${values.description.trim().length} characters. Tell students what the event is and who it is for.`}>
                <textarea rows={4} maxLength={600} {...bind('description')} />
              </Field>
              <Field id="ef-organizer" label="Organizer / club" required error={errors.organizer}>
                <select {...bind('organizer')}>
                  <option value="">Choose the organizer</option>
                  {organizerOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <div className="form-two">
                <Field id="ef-contactName" label="Contact person"><input type="text" {...bind('contactName')} /></Field>
                <Field id="ef-contactEmail" label="Contact email" error={errors.contactEmail} hint="Optional. Shown to students on the event page.">
                  <input type="email" autoComplete="off" {...bind('contactEmail')} />
                </Field>
              </div>
            </>
          )}

          {current.key === 'schedule' && (
            <>
              <Field id="ef-date" label="Event date" required error={errors.date}>
                <input type="date" min={isEdit ? undefined : todayISO()} {...bind('date')} />
              </Field>
              <div className="form-two">
                <Field id="ef-startTime" label="Start time" required error={errors.startTime}><input type="time" {...bind('startTime')} /></Field>
                <Field id="ef-endTime" label="End time" required error={errors.endTime}><input type="time" {...bind('endTime')} /></Field>
              </div>
              <ScheduleEditor rows={values.schedule} onChange={(rows) => set('schedule', rows)} />
            </>
          )}

          {current.key === 'venue' && (
            <>
              <Field id="ef-venue" label="Venue" required error={errors.venue}>
                <select {...bind('venue')}>
                  <option value="">Choose a venue</option>
                  {venueOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
              <ConflictNotice venue={values.venue} others={clashes} className="notice-spaced" />
              <Field id="ef-capacity" label="Capacity" required error={errors.capacity} hint={event?.registered ? `${event.registered} students are already registered.` : 'The number of seats you want to offer.'}>
                <input type="number" min="1" step="1" inputMode="numeric" {...bind('capacity')} />
              </Field>
            </>
          )}

          {current.key === 'registration' && (
            <>
              <Field id="ef-registrationOpensOn" label="Registration opens on (optional)" error={errors.registrationOpensOn} hint="Leave empty to open registration as soon as the event is approved.">
                <input type="date" max={values.registrationDeadline || values.date || undefined} {...bind('registrationOpensOn')} />
              </Field>
              <Field id="ef-registrationDeadline" label="Registration deadline" required error={errors.registrationDeadline} hint="Students can register until this date. It cannot be after the event date.">
                <input type="date" max={values.date || undefined} {...bind('registrationDeadline')} />
              </Field>
              <p className="field-hint">Registration opens on the date above (or when published) and closes automatically after the deadline. The event becomes ongoing at its start time and completed after its end time.</p>
            </>
          )}

          {current.key === 'rules' && (
            <>
              <ListEditor id="ef-rules" label="Rule" values={values.rules} onChange={(v) => set('rules', v)} placeholder="For example: Carry your college ID card." addLabel="Add a rule" />
              <ListEditor id="ef-prizes" label="Prize" values={values.prizes} onChange={(v) => set('prizes', v)} placeholder="For example: First place: trophy" addLabel="Add a prize" />
            </>
          )}

          {current.key === 'media' && (
            <>
              <Field id="ef-poster" label="Event poster" error={errors.poster} hint="JPG, PNG or WebP, under 5 MB. Optional.">
                <input type="file" accept="image/*" onChange={onPoster} />
              </Field>
              {poster.url ? (
                <figure className="poster-preview"><img src={poster.url} alt={`Preview of ${poster.name}`} /><figcaption>{poster.name}</figcaption></figure>
              ) : (
                <div className="poster-placeholder"><ImageIcon size={28} aria-hidden="true" /><span>{poster.name || 'No poster chosen'}</span></div>
              )}
              <p className="field-hint">Uploads are not connected yet. The image is only previewed in your browser and is not stored.</p>
            </>
          )}

          {current.key === 'review' && (
            <>
              {problemCount > 0 && (
                <div className="notice notice-danger" role="alert">
                  <div>
                    <strong>{problemCount} {problemCount === 1 ? 'thing needs' : 'things need'} attention before you can save.</strong>
                    <ul className="notice-list">
                      {STEPS.map((s, i) => (s.fields.some((f) => all[f]) ? (
                        <li key={s.key}><button type="button" className="link-btn" onClick={() => setStep(i)}>{s.label}</button>: {s.fields.filter((f) => all[f]).map((f) => all[f]).join(' ')}</li>
                      ) : null))}
                    </ul>
                  </div>
                </div>
              )}
              <ConflictNotice venue={values.venue} others={clashes} className="notice-spaced" />
              <EventSummary event={previewEvent} showStatus={false} />
            </>
          )}
        </div>

        <div className="form-actions">
          <Button variant="ghost" onClick={() => (step === 0 ? navigate(`${base}/events`) : setStep(step - 1))}>{step === 0 ? 'Cancel' : 'Back'}</Button>
          <div className="form-actions-right">
            {current.key !== 'review' ? (
              <Button type="submit">Next</Button>
            ) : !isEdit ? (
              <>
                <Button variant="outline" disabled={saving} onClick={() => save('draft')}>Save as draft</Button>
                <Button disabled={saving} onClick={() => save('submit')}>Publish event</Button>
              </>
            ) : (
              <>
                <Button variant="outline" disabled={saving} onClick={() => save('submit')}>Publish changes</Button>
                <Button disabled={saving} onClick={() => save('save')}>Save changes</Button>
              </>
            )}
          </div>
        </div>
      </form>
      {previewOpen && <EventPreviewModal event={previewEvent} title="Preview event" onClose={() => setPreviewOpen(false)} />}
      <Toast message={toast} onDone={closeToast} />
    </div>
  );
}
