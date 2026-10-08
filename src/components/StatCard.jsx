export default function StatCard({ label, value, note, tone = 'primary', icon: Icon }) {
  return (
    <div className={`card stat-card stat-${tone}`}>
      {Icon && (
        <span className="stat-icon" aria-hidden="true"><Icon size={20} /></span>
      )}
      <p className="stat-value">{value}</p>
      <p className="stat-label">{label}</p>
      {note && <p className="stat-note">{note}</p>}
    </div>
  );
}
