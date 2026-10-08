import { Star } from 'lucide-react';

// 1-5 star input. Each star is a real button, so it works with keyboard and screen readers.
export default function StarRating({ label, value, onChange }) {
  return (
    <fieldset className="star-rating">
      <legend>{label}</legend>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`star-btn ${n <= value ? 'is-on' : ''}`}
            aria-label={`${n} ${n === 1 ? 'star' : 'stars'} for ${label}`}
            aria-pressed={n === value}
            onClick={() => onChange(n)}
          >
            <Star size={24} aria-hidden="true" fill={n <= value ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function StarDisplay({ value }) {
  return (
    <span className="star-display" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={14} aria-hidden="true" fill={n <= value ? 'currentColor' : 'none'} className={n <= value ? 'is-on' : ''} />
      ))}
    </span>
  );
}
