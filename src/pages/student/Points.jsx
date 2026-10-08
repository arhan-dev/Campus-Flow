import { Star, Trophy } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import useStudentData from '../../hooks/useStudentData';
import { POINT_RULES } from '../../lib/constants';
import { formatDate } from '../../lib/dates';

export default function Points() {
  const { points, totalPoints } = useStudentData();
  const history = [...points].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="dash-page">
      <PageHeader title="Participation" text="Points you earn by taking part in campus events." crumb="Participation" />

      <div className="dash-grid">
        <section className="card panel points-hero" aria-labelledby="pts-heading">
          <span className="points-icon" aria-hidden="true"><Star size={26} /></span>
          <div>
            <h2 id="pts-heading" className="visually-hidden">Current points</h2>
            <p className="points-value">{totalPoints}</p>
            <p className="points-label">Current points</p>
            <p className="panel-sub">From {points.length} {points.length === 1 ? 'event' : 'events'}.</p>
          </div>
        </section>

        <section className="card panel" aria-labelledby="rules-heading">
          <div className="panel-head">
            <h2 id="rules-heading">How points work</h2>
            <Badge variant="approved">Active rules</Badge>
          </div>
          <p className="panel-sub">Points are added automatically by the database when your attendance is marked and when winner, runner-up or volunteer certificates are issued.</p>
          <ul className="rules-grid">
            {POINT_RULES.map((r) => (
              <li key={r.activity}><span>{r.activity}</span><strong>+{r.points}</strong></li>
            ))}
          </ul>
        </section>

        <section className="card panel panel-wide" aria-labelledby="hist-heading">
          <h2 id="hist-heading">Point history</h2>
          <p className="panel-sub">Every point you have earned</p>
          {history.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Event</th><th>Activity</th><th>Points</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.eventId}>
                      <td data-label="Event">{h.event.title}</td>
                      <td data-label="Activity"><Badge variant="neutral">{h.activity}</Badge></td>
                      <td data-label="Points"><strong className="points-plus">+{h.points}</strong></td>
                      <td data-label="Date">{formatDate(h.date)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td data-label="Event"><strong>Total</strong></td><td /><td data-label="Points"><strong>{totalPoints}</strong></td><td /></tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <EmptyState icon={Trophy} title="No points yet" text="Take part in an event to earn your first points." actionLabel="Explore Events" actionTo="/student/events" />
          )}
        </section>
      </div>
    </div>
  );
}
