import { AlertTriangle } from 'lucide-react';

// Venue clash warning: same venue on the same day. It is a warning only, nothing blocks the event.
export default function ConflictNotice({ venue, others, className = '' }) {
  if (!others || others.length === 0) return null;
  return (
    <div className={`notice notice-warning ${className}`.trim()} role="note">
      <AlertTriangle size={18} aria-hidden="true" />
      <div>
        <strong>Potential venue conflict</strong>
        <p>{venue} is also used on the same day by {others.map((o) => o.title).join(', ')}. Check the times before approving.</p>
      </div>
    </div>
  );
}
