import { useCallback, useMemo, useState } from 'react';
import { Award, Eye, FileCheck2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import EmptyState from '../../components/EmptyState';
import CertificatePreview, { CertificateDownloadButton } from '../../components/CertificatePreview';
import InfoNote from '../../components/manage/InfoNote';
import { AttendanceBadge, CertificateBadge } from '../../components/manage/StatusPills';
import useToast from '../../hooks/useToast';
import useCampusData from '../../hooks/useCampusData';
import { issueCertificates } from '../../services/campusService';
import { CERTIFICATE_TYPES } from '../../lib/constants';
import { formatDate, todayISO } from '../../lib/dates';

const FLOW = ['Select event', 'Select participants', 'Select certificate type', 'Issue certificates', 'Preview'];

export default function OrganizerCertificates() {
  const data = useCampusData();
  const [toast, showToast, closeToast] = useToast();
  const options = useMemo(() => data.myEvents.filter((e) => data.rosterFor(e.id).length > 0).sort((a, b) => b.date.localeCompare(a.date)), [data]);
  const [eventId, setEventId] = useState(options[0]?.id ?? null);
  const [selected, setSelected] = useState([]); // student ids
  const [type, setType] = useState('Participation');
  const [previewCert, setPreviewCert] = useState(null);
  const [generated, setGenerated] = useState(false);
  const closePreview = useCallback(() => setPreviewCert(null), []);

  const event = eventId ? data.getEvent(eventId) : null;
  const roster = event ? data.rosterFor(event.id) : [];
  const certs = new Map(data.certificateRows.filter((c) => c.eventId === eventId).map((c) => [c.studentId, c]));
  const eligible = roster.filter((r) => r.attendance === 'Present' && !certs.has(r.studentId));
  const allSelected = eligible.length > 0 && eligible.every((r) => selected.includes(r.studentId));

  // 1 = event chosen, 2 = participants chosen, 3 = type chosen (always), 4 = generated
  const stepNow = generated ? 5 : selected.length > 0 ? 4 : 2;

  const changeEvent = (id) => { setEventId(id); setSelected([]); setGenerated(false); };
  const toggle = (studentId) => setSelected((s) => (s.includes(studentId) ? s.filter((x) => x !== studentId) : [...s, studentId]));
  const toggleAll = () => setSelected(allSelected ? [] : eligible.map((r) => r.studentId));

  const [busy, setBusy] = useState(false);
  const generate = async () => {
    setBusy(true);
    try {
      const picked = [...selected];
      const issued = await issueCertificates(picked.map((studentId) => ({ studentId, eventId: event.id, type })));
      await data.refresh();
      showToast(`${picked.length} ${picked.length === 1 ? 'certificate' : 'certificates'} issued.`);
      setGenerated(true);
      setSelected([]);
      // Show the first new certificate as a preview
      const firstStudent = data.studentById[issued[0].studentId];
      setPreviewCert({ id: issued[0].number, verificationCode: issued[0].code, type, issuedOn: todayISO(), event, studentName: firstStudent.name });
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const openPreview = (cert) => setPreviewCert({ ...cert, studentName: cert.student.name });

  if (options.length === 0) {
    return (
      <div className="dash-page">
        <PageHeader homePath="/organizer/dashboard" title="Certificates" crumb="Certificates" />
        <EmptyState icon={Award} title="No certificates to manage yet" text="Certificates are issued to participants of your events once attendance is marked." actionLabel="Go to attendance" actionTo="/organizer/attendance" />
      </div>
    );
  }

  return (
    <div className="dash-page">
      <PageHeader homePath="/organizer/dashboard" title="Certificates" text="Issue certificates to the students who attended your events." crumb="Certificates" />
      <InfoNote>Certificates are saved to the database with a number and a verification code. Download the PDF from any issued certificate; anyone can verify it on the public verification page.</InfoNote>

      <ol className="flow-steps flow-inline" aria-label="Certificate steps">
        {FLOW.map((step, i) => (
          <li key={step} className={i + 1 <= stepNow ? 'is-reached' : ''}><span className="flow-num" aria-hidden="true">{i + 1}</span><span>{step}</span></li>
        ))}
      </ol>

      <section className="card panel" aria-label="Issue certificates">
        <div className="form-two">
          <div className="field">
            <label htmlFor="ct-event">Event</label>
            <select id="ct-event" value={eventId} onChange={(e) => changeEvent(e.target.value)}>
              {options.map((e) => <option key={e.id} value={e.id}>{e.title} ({formatDate(e.date)})</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ct-type">Certificate type</label>
            <select id="ct-type" value={type} onChange={(e) => setType(e.target.value)}>
              {CERTIFICATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="panel-head">
          <h2>Participants</h2>
          <div className="head-actions">
            <Button variant="outline" size="sm" onClick={toggleAll} disabled={eligible.length === 0}>{allSelected ? 'Clear selection' : 'Select all eligible'}</Button>
            <Button icon={FileCheck2} onClick={generate} disabled={selected.length === 0 || busy}>{busy ? 'Issuing...' : 'Issue'} {selected.length > 0 && !busy ? `${selected.length} ` : ''}certificate{selected.length === 1 ? '' : 's'}</Button>
          </div>
        </div>
        <p className="panel-sub">Only students marked present can receive a certificate. Choose the type above, then select participants.</p>

        <div className="table-wrap">
          <table className="table">
            <thead><tr><th><span className="visually-hidden">Select</span></th><th>Participant</th><th>Attendance</th><th>Certificate type</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {roster.map((r) => {
                const cert = certs.get(r.studentId);
                const canSelect = !cert && r.attendance === 'Present';
                return (
                  <tr key={r.key}>
                    <td data-label="Select">
                      <input type="checkbox" className="table-check" checked={selected.includes(r.studentId)} disabled={!canSelect} onChange={() => toggle(r.studentId)} aria-label={`Select ${r.student.name}`} />
                    </td>
                    <td data-label="Participant"><strong>{r.student.name}</strong></td>
                    <td data-label="Attendance"><AttendanceBadge status={r.attendance} /></td>
                    <td data-label="Certificate type">{cert ? cert.type : '-'}</td>
                    <td data-label="Status">{cert ? <CertificateBadge status="Issued" /> : canSelect ? <CertificateBadge status="Pending" /> : <span className="row-muted">Not eligible</span>}</td>
                    <td data-label="Action">{cert ? <Button size="sm" variant="outline" icon={Eye} onClick={() => openPreview(cert)} aria-label={`Preview certificate for ${r.student.name}`}>Preview</Button> : <span className="row-muted">-</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {eligible.length === 0 && <p className="panel-sub">No one is waiting for a certificate for this event.</p>}
      </section>

      {previewCert && (
        <Modal open size="lg" title="Certificate preview" onClose={closePreview} footer={(<><CertificateDownloadButton certificate={previewCert} studentName={previewCert.studentName} onError={(m) => showToast(m, 'error')} /><Button variant="ghost" onClick={closePreview}>Close</Button></>)}>
          <CertificatePreview certificate={previewCert} studentName={previewCert.studentName} logoTo="/organizer/certificates" />
        </Modal>
      )}
      <Toast message={toast} onDone={closeToast} />
    </div>
  );
}
