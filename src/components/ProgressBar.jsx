import { useEffect, useState } from 'react';

// Animated progress bar. Fills from 0 to the real value after it appears.
export default function ProgressBar({ value, max, label, tone = 'secondary', highlightFull = true }) {
  const percent = Math.min(100, Math.round((value / max) * 100));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(percent));
    return () => cancelAnimationFrame(frame);
  }, [percent]);

  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div className={`progress-fill progress-${highlightFull && percent >= 100 ? 'danger' : tone}`} style={{ width: `${width}%` }} />
    </div>
  );
}
