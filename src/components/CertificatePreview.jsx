import { useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import Button from './Button';
import { formatDate } from '../lib/dates';
import { downloadCertificate } from '../lib/certificatePdf';
import { verificationUrl } from '../services/certificateService';

// Download button: builds the PDF in the browser from the certificate record and saves it.
export function CertificateDownloadButton({ certificate, studentName, size = 'md', variant = 'primary', label = 'Download PDF', onError }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await downloadCertificate({
        certificate, studentName, event: certificate.event,
        verifyUrl: certificate.verificationCode ? verificationUrl(certificate.verificationCode) : '',
      });
    } catch (e) {
      onError?.(e.message || 'The certificate could not be created.');
    } finally {
      setBusy(false);
    }
  };
  return <Button size={size} variant={variant} icon={Download} onClick={run} disabled={busy || !certificate.event}>{busy ? 'Preparing...' : label}</Button>;
}

// On-screen view of the certificate record. The PDF button creates the real file.
export default function CertificatePreview({ certificate, studentName, logoTo = '/student/certificates' }) {
  const { event } = certificate;
  return (
    <div className="cert-preview">
      <div className="cert-frame">
        <div className="cert-brand"><Logo to={logoTo} /></div>
        <p className="cert-kicker">Certificate of {certificate.type}</p>
        <p className="cert-line">This is to recognise that</p>
        <p className="cert-name">{studentName}</p>
        <p className="cert-line">took part in</p>
        <p className="cert-event">{event.title}</p>
        <p className="cert-line">held on {formatDate(event.date)}{event.venue ? ` at ${event.venue}` : ''}</p>
        <div className="cert-foot">
          <span>Issued {formatDate(certificate.issuedOn)}</span>
          <span className="mono">{certificate.id}</span>
          {certificate.verificationCode && <span className="mono">Code {certificate.verificationCode}</span>}
        </div>
      </div>
      <p className="modal-note">
        <ShieldCheck size={14} aria-hidden="true" /> Anyone can check this certificate at{' '}
        <Link to={certificate.verificationCode ? `/verify-certificate/${certificate.verificationCode}` : '/verify-certificate'}>the verification page</Link>.
      </p>
    </div>
  );
}
