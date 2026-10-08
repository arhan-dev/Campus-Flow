import { useState } from 'react';
import Button from './Button';
import StarRating from './StarRating';

const CATEGORIES = [
  { key: 'overall', label: 'Overall experience' },
  { key: 'organization', label: 'Event organization' },
  { key: 'content', label: 'Content' },
  { key: 'speaker', label: 'Speaker' },
  { key: 'venue', label: 'Venue' },
];

export default function FeedbackForm({ eventTitle, onSubmit, onCancel, serverError = '' }) {
  const [busy, setBusy] = useState(false);
  const [ratings, setRatings] = useState({ overall: 0, organization: 0, content: 0, speaker: 0, venue: 0 });
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (Object.values(ratings).some((r) => r === 0)) {
      setError('Please give a rating for every category.');
      return;
    }
    setBusy(true);
    try { await onSubmit({ ratings, comments: comments.trim() }); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="feedback-form" noValidate>
      <p className="feedback-intro">How was <strong>{eventTitle}</strong>? Rate each part from 1 to 5 stars.</p>
      {CATEGORIES.map(({ key, label }) => (
        <StarRating key={key} label={label} value={ratings[key]} onChange={(n) => { setRatings({ ...ratings, [key]: n }); setError(''); }} />
      ))}
      <div className="field">
        <label htmlFor="feedback-comments">Comments (optional)</label>
        <textarea id="feedback-comments" rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="What went well? What could be better?" />
      </div>
      {(error || serverError) && <p className="form-error" role="alert">{error || serverError}</p>}
      <p className="modal-note">You can submit feedback once for each event.</p>
      <div className="feedback-actions">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy ? 'Submitting...' : 'Submit Feedback'}</Button>
      </div>
    </form>
  );
}
