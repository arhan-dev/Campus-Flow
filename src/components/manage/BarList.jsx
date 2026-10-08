import ProgressBar from '../ProgressBar';

// Horizontal bars with a label and a value. items: [{ label, value, max, display }]
export default function BarList({ items, tone = 'secondary', empty = 'Nothing to show yet.' }) {
  if (items.length === 0) return <p className="panel-sub">{empty}</p>;
  return (
    <ul className="bar-list">
      {items.map((item) => (
        <li key={item.label}>
          <div className="bar-list-head"><span>{item.label}</span><strong>{item.display ?? item.value}</strong></div>
          <ProgressBar value={item.value} max={Math.max(item.max || 1, 1)} label={item.label} tone={tone} highlightFull={false} />
        </li>
      ))}
    </ul>
  );
}
