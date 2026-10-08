// variant examples: approved, pending, rejected, open, full, completed, cancelled,
// technical, cultural, sports, workshop, hackathon, competition, seminar
export default function Badge({ variant = 'neutral', children, dot = false }) {
  return (
    <span className={`badge badge-${variant}`}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
