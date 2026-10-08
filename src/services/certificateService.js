import { supabase } from '../lib/supabase';
import { unwrap } from '../lib/errors';
import { DB_TO_CERT_TYPE } from '../lib/constants';

// Public certificate check. Works without a login: the database function returns only public facts.
// Returns { found: false } or { found: true, valid, status, number, type, issuedOn, recipient, recipientMasked, event, eventDate }.
export async function lookupCertificate(query) {
  const data = unwrap(await supabase.rpc('verify_certificate', { p_query: query }), 'Could not check the certificate.');
  if (!data?.found) return { found: false };
  return {
    found: true,
    valid: Boolean(data.valid),
    status: data.status,
    number: data.certificate_number,
    type: DB_TO_CERT_TYPE[data.certificate_type] || 'Participation',
    issuedOn: String(data.issued_at || '').slice(0, 10),
    recipient: data.recipient || '',
    recipientMasked: Boolean(data.recipient_masked),
    event: data.event_title || '',
    eventDate: data.event_date || '',
  };
}

// The address a certificate's QR code points to
export const verificationUrl = (code) => `${window.location.origin}/verify-certificate/${encodeURIComponent(code)}`;
