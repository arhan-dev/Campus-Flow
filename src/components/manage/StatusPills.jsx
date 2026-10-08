import Badge from '../Badge';

// Small status badges for registrations, attendance, certificates and accounts. The text always says the status.
export function RegistrationBadge({ status }) {
  const variant = { Confirmed: 'approved', Waitlisted: 'pending', Cancelled: 'cancelled' }[status] || 'neutral';
  return <Badge variant={variant}>{status}</Badge>;
}

export function AttendanceBadge({ status }) {
  if (status === 'Present') return <Badge variant="present" dot>Present</Badge>;
  if (status === 'Absent') return <Badge variant="absent" dot>Absent</Badge>;
  if (status === 'Pending') return <Badge variant="pending">Not marked</Badge>;
  return <span className="row-muted">-</span>;
}

export function CertificateBadge({ status }) {
  if (status === 'Issued') return <Badge variant="approved">Issued</Badge>;
  if (status === 'Pending') return <Badge variant="pending">Ready to issue</Badge>;
  return <span className="row-muted">-</span>;
}

export function AccountBadge({ status }) {
  const variant = { Active: 'active', Inactive: 'inactive', Pending: 'pending' }[status] || 'neutral';
  return <Badge variant={variant} dot>{status}</Badge>;
}

export function ActiveBadge({ status }) {
  return <Badge variant={status === 'Available' || status === 'Active' ? 'active' : 'pending'} dot>{status}</Badge>;
}
