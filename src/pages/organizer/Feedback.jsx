import { useCallback, useState } from 'react';
import { MessageSquare, Eye } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import { StarDisplay } from '../../components/StarRating';
import BarList from '../../components/manage/BarList';
import useCampusData from '../../hooks/useCampusData';
import { RATING_LABELS } from '../../lib/constants';
import { formatDate } from '../../lib/dates';

const rating = (v) => (typeof v === 'number' ? v.toFixed(1) : 'N/A');

export default function OrganizerFeedback() {
  const { feedback, myEvents } = useCampusData();
  const [openId, setOpenId] = useState(null);
  const close = useCallback(() => setOpenId(null), []);
  const mine = feedback.filter((f) => myEvents.some((e) => e.id === f.eventId));
  const detail = mine.find((f) => f.eventId === openId);

  return (
    <div className="dash-page">
      <PageHeader homePath="/organizer/dashboard" title="Feedback" text="What students said about your events after they ended." crumb="Feedback" />

      <section className="card panel" aria-label="Feedback by event">
        {mine.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No feedback yet" text="Feedback appears here after your events finish and students respond." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Event</th><th>Responses</th><th>Average</th><th>Organization</th><th>Content</th><th>Speaker</th><th>Venue</th><th>Details</th></tr>
              </thead>
              <tbody>
                {mine.map((f) => (
                  <tr key={f.eventId}>
                    <td data-label="Event"><strong>{f.event.title}</strong><p className="cell-note">{formatDate(f.event.date)}</p></td>
                    <td data-label="Responses">{f.responses}</td>
                    <td data-label="Average"><span className="rating-cell"><StarDisplay value={Math.round(f.ratings.overall)} /> {rating(f.ratings.overall)}</span></td>
                    <td data-label="Organization">{rating(f.ratings.organization)}</td>
                    <td data-label="Content">{rating(f.ratings.content)}</td>
                    <td data-label="Speaker">{rating(f.ratings.speaker)}</td>
                    <td data-label="Venue">{rating(f.ratings.venue)}</td>
                    <td data-label="Details"><Button size="sm" variant="outline" icon={Eye} onClick={() => setOpenId(f.eventId)} aria-label={`Feedback details for ${f.event.title}`}>Details</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detail && (
        <Modal open size="lg" title={`Feedback: ${detail.event.title}`} onClose={close} footer={<Button onClick={close}>Close</Button>}>
          <div className="rating-big">
            <strong>{rating(detail.ratings.overall)}</strong>
            <div><StarDisplay value={Math.round(detail.ratings.overall)} /><span>average of {detail.responses} {detail.responses === 1 ? 'response' : 'responses'}</span></div>
          </div>
          <h3 className="modal-subhead">Rating breakdown</h3>
          <BarList
            items={['organization', 'content', 'speaker', 'venue'].filter((k) => typeof detail.ratings[k] === 'number').map((k) => ({ label: RATING_LABELS[k], value: detail.ratings[k], max: 5, display: `${rating(detail.ratings[k])} / 5` }))}
          />
          <h3 className="modal-subhead">Comments</h3>
          {detail.comments.length === 0 ? <p>No comments were left.</p> : (
            <ul className="comment-list">{detail.comments.map((c) => <li key={c}>{c}</li>)}</ul>
          )}
          <p className="modal-note">Comments are shown without names.</p>
        </Modal>
      )}
    </div>
  );
}
