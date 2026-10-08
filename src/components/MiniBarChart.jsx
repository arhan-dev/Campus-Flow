// Small CSS bar chart, no chart library needed.
export default function MiniBarChart({ labels, values, unit = '' }) {
  const max = Math.max(...values, 1);
  return (
    <div className="bar-chart" role="img" aria-label={`Bar chart: ${labels.map((l, i) => `${l} ${values[i]}${unit}`).join(', ')}`}>
      {values.map((value, i) => (
        <div className="bar-col" key={labels[i]}>
          <span className="bar-value">{value}{unit}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ height: `${Math.max((value / max) * 100, 4)}%` }} />
          </div>
          <span className="bar-label">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
