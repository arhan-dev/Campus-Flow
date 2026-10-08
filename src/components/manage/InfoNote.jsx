import { Info } from 'lucide-react';

// Small note banner for limits that matter on a page (for example features planned for a later phase).
export default function InfoNote({ children }) {
  return (
    <p className="demo-note-bar" role="note">
      <Info size={16} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
