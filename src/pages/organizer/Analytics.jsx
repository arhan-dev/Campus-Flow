import { CalendarDays, Users, Gauge, Star } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import EmptyState from '../../components/EmptyState';
import BarList from '../../components/manage/BarList';
import DonutChart from '../../components/manage/DonutChart';
import useCampusData from '../../hooks/useCampusData';
import { averageRating, fillRate, helpers } from '../../data/campusSelectors';
import { useCatalog } from '../../context/DataContext';

const CATEGORY_COLORS = {
  Technical: 'var(--cat-technical)', Cultural: 'var(--cat-cultural)', Sports: 'var(--cat-sports)', Workshop: 'var(--cat-workshop)',
  Hackathon: 'var(--cat-hackathon)', Competition: 'var(--cat-competition)', Seminar: 'var(--cat-seminar)',
};

export default function OrganizerAnalytics() {
  const { categoryNames: CATEGORY_LIST } = useCatalog();
  const data = useCampusData();
  const events = data.myEvents.filter((e) => !['Draft', 'Pending Approval', 'Rejected', 'Cancelled'].includes(e.lifecycle));
  if (events.length === 0) {
    return (
      <div className="dash-page">
        <PageHeader homePath="/organizer/dashboard" title="Analytics" crumb="Analytics" />
        <EmptyState icon={CalendarDays} title="No data yet" text="Analytics appear once you have approved events." actionLabel="Create event" actionTo="/organizer/events/create" />
      </div>
    );
  }

  const totalRegistered = events.reduce((s, e) => s + e.registered, 0);
  const totalCapacity = events.reduce((s, e) => s + e.capacity, 0);
  const myFeedback = data.feedback.filter((f) => events.some((e) => e.id === f.eventId));
  const avg = averageRating(myFeedback);
  const attendanceRows = events.map((e) => ({ event: e, ...data.attendanceSummary(e.id) })).filter((r) => r.marked > 0);
  const categories = CATEGORY_LIST.map((c) => ({ label: c, value: events.filter((e) => e.category === c).length, color: CATEGORY_COLORS[c] })).filter((c) => c.value > 0);

  return (
    <div className="dash-page">
      <PageHeader homePath="/organizer/dashboard" title="Analytics" text="How your events are performing." crumb="Analytics" />

      <div className="grid grid-stats">
        <StatCard label="Events" value={events.length} note="Approved, open or completed" tone="primary" icon={CalendarDays} />
        <StatCard label="Registrations" value={totalRegistered.toLocaleString('en-IN')} tone="secondary" icon={Users} />
        <StatCard label="Seats used" value={`${helpers.pct(totalRegistered, totalCapacity)}%`} note={`${totalRegistered} of ${totalCapacity} seats`} tone="warning" icon={Gauge} />
        <StatCard label="Average rating" value={avg ?? '-'} note={avg ? 'Out of 5' : 'No feedback yet'} tone="success" icon={Star} />
      </div>

      <div className="dash-grid">
        <section className="card panel panel-wide" aria-labelledby="reg-cap">
          <h2 id="reg-cap">Registrations vs capacity</h2>
          <p className="panel-sub">Seats filled for each event</p>
          <BarList items={events.map((e) => ({ label: e.title, value: e.registered, max: e.capacity, display: `${e.registered} / ${e.capacity}` }))} />
        </section>

        <section className="card panel" aria-labelledby="cat-dist">
          <h2 id="cat-dist">Event categories</h2>
          <DonutChart segments={categories} ariaLabel={`Events by category: ${categories.map((c) => `${c.label} ${c.value}`).join(', ')}`} />
        </section>

        <section className="card panel" aria-labelledby="att-by-event">
          <h2 id="att-by-event">Attendance by event</h2>
          <p className="panel-sub">Present out of everyone marked</p>
          <BarList tone="success" items={attendanceRows.map((r) => ({ label: r.event.title, value: r.present, max: r.marked, display: `${helpers.pct(r.present, r.marked)}%` }))} empty="No attendance has been marked yet." />
        </section>

        <section className="card panel panel-wide" aria-labelledby="fb-ratings">
          <h2 id="fb-ratings">Feedback ratings</h2>
          <p className="panel-sub">Overall rating out of 5</p>
          <BarList items={myFeedback.map((f) => ({ label: f.event.title, value: f.ratings.overall, max: 5, display: f.ratings.overall.toFixed(1) }))} empty="No feedback yet." />
        </section>

        <section className="card panel panel-wide" aria-labelledby="detail-table">
          <h2 id="detail-table">Event details</h2>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Event</th><th>Category</th><th>Registrations</th><th>Capacity</th><th>Seats used</th><th>Attendance</th><th>Rating</th></tr></thead>
              <tbody>
                {events.map((e) => {
                  const att = data.attendanceSummary(e.id);
                  const fb = data.feedback.find((f) => f.eventId === e.id);
                  return (
                    <tr key={e.id}>
                      <td data-label="Event"><strong>{e.title}</strong></td>
                      <td data-label="Category">{e.category}</td>
                      <td data-label="Registrations">{e.registered}</td>
                      <td data-label="Capacity">{e.capacity}</td>
                      <td data-label="Seats used">{fillRate(e)}%</td>
                      <td data-label="Attendance">{att.marked ? `${helpers.pct(att.present, att.marked)}%` : '-'}</td>
                      <td data-label="Rating">{fb ? fb.ratings.overall.toFixed(1) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
