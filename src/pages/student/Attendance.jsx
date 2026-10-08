import { ClipboardX, CheckCircle2, Percent, Clock } from 'lucide-react';
import Button from '../../components/Button';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';
import EmptyState from '../../components/EmptyState';
import useStudentData from '../../hooks/useStudentData';
import { formatDate } from '../../lib/dates';

export default function Attendance() {
  const { attendance, upcoming } = useStudentData();
  const present = attendance.filter((a) => a.status === 'Present');
  const rate = attendance.length ? Math.round((present.length / attendance.length) * 100) : 0;
  const recent = [...present].sort((a, b) => b.event.date.localeCompare(a.event.date))[0];

  // Completed events have records. Upcoming registered events are "Pending" until they happen.
  const rows = [
    ...upcoming.filter((r) => !attendance.some((a) => a.eventId === r.eventId)).map((r) => ({ key: `p${r.eventId}`, event: r.event, status: 'Pending', method: 'After the event' })),
    ...[...attendance].sort((a, b) => b.event.date.localeCompare(a.event.date)).map((a) => ({ key: a.eventId, event: a.event, status: a.status, method: a.method })),
  ];

  return (
    <div className="dash-page">
      <PageHeader title="Attendance" text="Your attendance history for the events you registered for." crumb="Attendance" action={<Button variant="outline" to="/student/check-in">QR check-in</Button>} />

      <div className="grid grid-3-stats">
        <StatCard icon={CheckCircle2} tone="success" value={String(present.length)} label="Events attended" />
        <StatCard icon={Percent} tone="primary" value={`${rate}%`} label="Attendance rate" note={`${present.length} of ${attendance.length} marked events`} />
        <StatCard icon={Clock} tone="secondary" value={recent ? recent.event.title : 'None yet'} label="Most recent attendance" note={recent ? formatDate(recent.event.date) : undefined} />
      </div>

      <section className="card panel" aria-labelledby="att-heading">
        <h2 id="att-heading">Attendance records</h2>
        <p className="panel-sub">Attendance is marked by your event organizer or by you through QR check-in.</p>
        {rows.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Event</th><th>Date</th><th>Venue</th><th>Attendance</th><th>Method</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td data-label="Event">{r.event.title}</td>
                    <td data-label="Date">{formatDate(r.event.date)}</td>
                    <td data-label="Venue">{r.event.venue}</td>
                    <td data-label="Attendance"><Badge variant={r.status.toLowerCase()} dot>{r.status}</Badge></td>
                    <td data-label="Method">{r.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={ClipboardX} title="No attendance records" text="Your attendance will appear here after you join an event." actionLabel="Explore Events" actionTo="/student/events" />
        )}
      </section>
    </div>
  );
}
