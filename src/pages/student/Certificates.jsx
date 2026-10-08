import { useState } from 'react';
import { FileX, ShieldQuestion } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import CertificateCard from '../../components/CertificateCard';
import CertificatePreview, { CertificateDownloadButton } from '../../components/CertificatePreview';
import { downloadCertificate } from '../../lib/certificatePdf';
import { verificationUrl } from '../../services/certificateService';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Toast from '../../components/Toast';
import Badge from '../../components/Badge';
import useToast from '../../hooks/useToast';
import useStudentData from '../../hooks/useStudentData';

export default function Certificates() {
  const { student, certificates, attendedIds, completed } = useStudentData();
  const [selected, setSelected] = useState(null);
  const [toast, showToast, closeToast] = useToast();

  // Attended events that do not have a certificate yet
  const waiting = completed.filter((r) => attendedIds.includes(r.eventId) && !certificates.some((c) => c.eventId === r.eventId));

  return (
    <div className="dash-page">
      <PageHeader title="Certificates" text="Your participation certificates in one place." crumb="Certificates" />

      {certificates.length > 0 ? (
        <div className="grid grid-auto">
          {certificates.map((c) => (
            <CertificateCard
              key={c.id}
              certificate={c}
              onPreview={(cert) => { setSelected(cert); }}
              onDownload={async (cert) => {
                try {
                  await downloadCertificate({ certificate: cert, studentName: student.name, event: cert.event, verifyUrl: verificationUrl(cert.verificationCode) });
                  showToast('Certificate downloaded.');
                } catch (e) { showToast(e.message, 'error'); }
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={FileX} title="No certificates available" text="Certificates for events you attend will appear here." actionLabel="Explore Events" actionTo="/student/events" />
      )}

      <div className="dash-grid">
        <section className="card panel" aria-labelledby="waiting-heading">
          <h2 id="waiting-heading">Not issued yet</h2>
          <p className="panel-sub">Events you attended that do not have a certificate yet.</p>
          {waiting.length > 0 ? (
            <ul className="simple-list">
              {waiting.map((r) => <li key={r.eventId}><span>{r.event.title}</span><Badge variant="pending">Pending</Badge></li>)}
            </ul>
          ) : (
            <p className="panel-sub">Nothing is waiting.</p>
          )}
        </section>

        <section className="card panel" aria-labelledby="verify-heading">
          <div className="panel-head">
            <h2 id="verify-heading">Certificate verification</h2>
          </div>
          <p className="verify-text"><ShieldQuestion size={18} aria-hidden="true" /> Every certificate has its own number and verification code. Share the code or the QR on the PDF: anyone can check it on the public verification page without logging in.</p>
          <Button variant="outline" size="sm" to="/verify-certificate">Open verification page</Button>
        </section>
      </div>

      <Modal
        open={Boolean(selected)}
        title="Certificate Preview"
        size="lg"
        onClose={() => setSelected(null)}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            {selected && <CertificateDownloadButton certificate={selected} studentName={student.name} onError={(m) => showToast(m, 'error')} />}
          </>
        )}
      >
        {selected && <CertificatePreview certificate={selected} studentName={student.name} />}
      </Modal>

      <Toast message={toast} onDone={closeToast} />
    </div>
  );
}
