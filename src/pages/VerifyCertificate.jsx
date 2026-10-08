import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, ShieldX, ShieldAlert, Search, Loader2 } from 'lucide-react';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { lookupCertificate } from '../services/certificateService';
import { formatDate } from '../lib/dates';
import { INSTITUTION_NAME } from '../lib/constants';

// Public page: no login. The database function returns only public facts about a certificate.
export default function VerifyCertificate() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(code || '');
  const [state, setState] = useState({ status: 'idle', result: null, error: '' }); // idle | loading | done | error

  useEffect(() => {
    if (!code) { setState({ status: 'idle', result: null, error: '' }); return undefined; }
    let active = true;
    setInput(code);
    setState({ status: 'loading', result: null, error: '' });
    lookupCertificate(code)
      .then((result) => { if (active) setState({ status: 'done', result, error: '' }); })
      .catch((e) => { if (active) setState({ status: 'error', result: null, error: e.message }); });
    return () => { active = false; };
  }, [code]);

  const submit = (e) => {
    e.preventDefault();
    const value = input.trim();
    if (!value) return;
    if (value === code) navigate(0); else navigate(`/verify-certificate/${encodeURIComponent(value)}`);
  };

  const { status, result } = state;
  return (
    <section className="page-section">
      <div className="container verify-page">
        <div className="page-head">
          <h1>Verify a certificate</h1>
          <p>Enter the verification code or the certificate number printed on a {INSTITUTION_NAME} certificate. No login is needed.</p>
        </div>

        <form className="card panel verify-form" onSubmit={submit} role="search" aria-label="Certificate verification">
          <div className="field">
            <label htmlFor="verify-input">Verification code or certificate number</label>
            <div className="search-field">
              <Search size={18} aria-hidden="true" />
              <input id="verify-input" type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="For example 9F3A7C21BD or CF-2026-00001" autoComplete="off" maxLength={40} />
            </div>
          </div>
          <Button type="submit" disabled={!input.trim() || status === 'loading'}>{status === 'loading' ? 'Checking...' : 'Verify certificate'}</Button>
        </form>

        {status === 'loading' && <p className="panel-sub" role="status"><Loader2 size={16} className="spin" aria-hidden="true" /> Checking the certificate...</p>}

        {status === 'error' && (
          <div className="notice notice-danger" role="alert"><div><strong>We could not check the certificate</strong><p>{state.error}</p></div></div>
        )}

        {status === 'done' && !result.found && (
          <div className="card panel verify-result verify-bad" role="alert">
            <ShieldX size={36} aria-hidden="true" />
            <h2>Certificate not found / invalid certificate</h2>
            <p>No certificate matches that code or number. Check for typing mistakes. A certificate that cannot be found should not be trusted.</p>
          </div>
        )}

        {status === 'done' && result.found && (
          <div className={`card panel verify-result ${result.valid ? 'verify-good' : 'verify-warn'}`} role="status">
            {result.valid ? <ShieldCheck size={36} aria-hidden="true" /> : <ShieldAlert size={36} aria-hidden="true" />}
            <h2>{result.valid ? 'Valid certificate' : 'This certificate has been revoked'}</h2>
            <p>{result.valid ? `This certificate was issued by ${INSTITUTION_NAME} through CampusFlow.` : 'It was issued but has since been withdrawn and is no longer valid.'}</p>
            <dl className="verify-details">
              <div><dt>Status</dt><dd><Badge variant={result.valid ? 'approved' : 'rejected'} dot>{result.valid ? 'Valid' : 'Revoked'}</Badge></dd></div>
              <div><dt>Certificate number</dt><dd className="mono">{result.number}</dd></div>
              <div><dt>Recipient</dt><dd>{result.recipient}</dd></div>
              <div><dt>Event</dt><dd>{result.event}{result.eventDate ? ` (${formatDate(result.eventDate)})` : ''}</dd></div>
              <div><dt>Certificate type</dt><dd>{result.type}</dd></div>
              <div><dt>Date of issue</dt><dd>{formatDate(result.issuedOn)}</dd></div>
              <div><dt>Issued by</dt><dd>{INSTITUTION_NAME} (CampusFlow)</dd></div>
            </dl>
            {result.recipientMasked && <p className="field-hint">The recipient name is partly hidden because you searched by certificate number. Use the verification code on the certificate to see the full name.</p>}
          </div>
        )}
      </div>
    </section>
  );
}
