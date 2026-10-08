import { useState } from 'react';
import { MessageSquareOff } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Tabs from '../../components/Tabs';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import FeedbackForm from '../../components/FeedbackForm';
import { StarDisplay } from '../../components/StarRating';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';
import useStudentData from '../../hooks/useStudentData';
import { useAuth } from '../../context/AuthContext';
import { submitFeedback } from '../../services/studentService';
import { formatDate } from '../../lib/dates';

const TABS = ['Pending', 'Submitted'];

// Feedback is only offered for events the student attended.
export default function Feedback() {
  const { profile } = useAuth();
  const { feedbackPending, feedbackDone, feedbackDetails, refresh } = useStudentData();
  const [formError, setFormError] = useState('');
  const [tab, setTab] = useState('Pending');
  const [event, setEvent] = useState(null);
  const [toast, showToast, closeToast] = useToast();

  const list = tab === 'Pending' ? feedbackPending : feedbackDone;

  const submit = async (data) => {
    setFormError('');
    try {
      await submitFeedback(event.id, profile.id, data);
      await refresh();
      setEvent(null);
      setTab('Submitted');
      showToast('Thank you for your feedback.');
    } catch (e) {
      setFormError(e.message);
    }
  };

  return (
    <div className="dash-page">
      <PageHeader title="Feedback" text="Tell organizers how the events you attended went." crumb="Feedback" />

      <section className="card panel">
        <div className="panel-head">
          <Tabs tabs={TABS} active={tab} onChange={setTab} label="Feedback status" />
          <span className="panel-sub">{feedbackPending.length} pending</span>
        </div>

        {list.length > 0 ? (
          <ul className="event-rows">
            {list.map((e) => {
              const given = feedbackDetails[e.id]?.ratings?.overall;
              return (
                <li key={e.id}>
                  <div className="event-row-info">
                    <strong>{e.title}</strong>
                    <p>{formatDate(e.date)}</p>
                  </div>
                  {tab === 'Pending' ? (
                    <>
                      <Badge variant="pending" dot>Feedback pending</Badge>
                      <Button size="sm" onClick={() => setEvent(e)}>Give Feedback</Button>
                    </>
                  ) : (
                    <>
                      {given ? <StarDisplay value={given} /> : null}
                      <Badge variant="submitted" dot>Submitted</Badge>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={MessageSquareOff}
            title={tab === 'Pending' ? 'No feedback pending' : 'No feedback submitted'}
            text={tab === 'Pending' ? 'Feedback requests appear here after you attend an event.' : 'Feedback you submit will be listed here.'}
          />
        )}
      </section>

      <Modal open={Boolean(event)} title="Give feedback" size="lg" onClose={() => { setEvent(null); setFormError(''); }}>
        {event && <FeedbackForm eventTitle={event.title} onSubmit={submit} onCancel={() => { setEvent(null); setFormError(''); }} serverError={formError} />}
      </Modal>
      <Toast message={toast} onDone={closeToast} />
    </div>
  );
}
