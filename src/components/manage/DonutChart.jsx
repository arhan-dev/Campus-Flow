// CSS donut chart with a legend, no chart library needed. segments: [{ label, value, color }]
export default function DonutChart({ segments, centerLabel, ariaLabel }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let cursor = 0;
  const stops = segments.filter((s) => s.value > 0).map((s) => {
    const start = cursor;
    cursor += (s.value / total) * 100;
    return `${s.color} ${start}% ${cursor}%`;
  });
  const background = total > 0 ? `conic-gradient(${stops.join(', ')})` : 'var(--border)';
  const description = ariaLabel || `Chart: ${segments.map((s) => `${s.label} ${s.value}`).join(', ')}`;

  return (
    <div className="donut-wrap">
      <div className="donut" role="img" aria-label={description} style={{ background }}>
        <span>{centerLabel ?? total}</span>
      </div>
      <ul className="legend">
        {segments.map((s) => (
          <li key={s.label}><span className="legend-dot" style={{ background: s.color }} /> {s.label}: <strong>{s.value}</strong></li>
        ))}
      </ul>
    </div>
  );
}
