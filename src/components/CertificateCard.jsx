import { Award, Eye, Download, ShieldCheck } from 'lucide-react';
import Badge from './Badge';
import Button from './Button';
import { formatDate } from '../lib/dates';

export default function CertificateCard({ certificate, onPreview, onDownload }) {
  const { event } = certificate;
  return (
    <article className="card card-hover certificate-card">
      <div className="certificate-card-top">
        <span className="certificate-icon" aria-hidden="true"><Award size={22} /></span>
        <Badge variant="approved">Issued</Badge>
      </div>
      <h3>{event.title}</h3>
      <dl className="certificate-meta">
        <div><dt>Type</dt><dd><Badge variant={certificate.type === 'Participation' ? 'neutral' : 'approved'}>{certificate.type}</Badge></dd></div>
        <div><dt>Issued</dt><dd>{formatDate(certificate.issuedOn)}</dd></div>
        <div><dt>Certificate ID</dt><dd className="mono">{certificate.id}</dd></div>
      </dl>
      <div className="certificate-actions">
        <Button variant="outline" size="sm" icon={Eye} onClick={() => onPreview(certificate)}>Preview</Button>
        <Button variant="ghost" size="sm" icon={Download} onClick={() => onDownload(certificate)}>Download</Button>
        {certificate.verificationCode && <Button variant="ghost" size="sm" icon={ShieldCheck} to={`/verify-certificate/${certificate.verificationCode}`}>Verify</Button>}
      </div>
    </article>
  );
}
