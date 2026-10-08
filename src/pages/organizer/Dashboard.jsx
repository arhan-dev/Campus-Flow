import { Link } from 'react-router-dom';
import { CalendarDays, Users, CheckCircle2, ClipboardList, AlertTriangle, Star } from 'lucide-react';
import StatCard from '../../components/StatCard';
import Button from '../../components/Button';
import ProgressBar from '../../components/ProgressBar';
import EmptyState from '../../components/EmptyState';
import { StarDisplay } from '../../components/StarRating';
import LifecycleBadge from '../../components/manage/LifecycleBadge';
import DonutChart from '../../components/manage/DonutChart';
import useCampusData from '../../hooks/useCampusData';
import { formatDate, todayISO } from '../../lib/dates';
import { isUpcoming, averageRating, fillRate } from '../../data/campusSelectors';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function OrganizerDashboard() {
  const data = useCampusData();
  const { organizer, myEvents, feedback, pendingCertificates } = data;
  const published = myEvents.filter((e) => e.lifecycle !== 'Draft' && e.lifecycle !== 'Rejected' && e.lifecycle !== 'Pending Approval' && e.lifecycle !== 'Cancelled');
  const upcoming = myEvents.filter(isUpcoming).sort((a, b) => a.date.localeCompare(b.date));
  const totalRegistrations = published.reduce((sum, e) => sum + e.registered, 0);
  const myRegs = data.registrations.filter((r) => myEvents.some((e) => e.id === r.eventId));
  const attendance = data.summarize(myRegs);
  const myFeedback = feedback.filter((f) => myEvents.some((e) => e.id === f.eventId));
  const avgRating = averageRating(myFeedback);
  const responses = myFeedback.reduce((sum, f) => sum + f.responses, 0);
  const myCertsPending = pendingCertificates.filter((r) => myEvents.some((e) => e.id === r.eventId));

  // Things the organizer should look at first
  const attention = [];
  myEvents.filter((e) => e.lifecycle === 'Rejected').forEach((e) => attention.push({ key: `r${e.id}`, tone: 'danger', text: `${e.title} was rejected: ${e.rejectionReason}.`, to: `/organizer/events/${e.id}/edit`, action: 'Fix and resubmit' }));
  myEvents.filter((e) => e.lifecycle === 'Draft').forEach((e) => attention.push({ key: `d${e.id}`, tone: 'warning', text: `${e.title} is still a draft.`, to: `/organizer/events/${e.id}/edit`, action: 'Finish draft' }));
  myEvents.filter((e) => e.lifecycle === 'Pending Approval').forEach((e) => attention.push({ key: `p${e.id}`, tone: 'info', text: `${e.title} is awaiting a publish state.`, to: '/organizer/events', action: 'View' }));
  upcoming.filter((e) => fillRate(e) >= 100).forEach((e) => attention.push({ key: `f${e.id}`, tone: 'warning', text: `${e.title} is full (${e.registered} of ${e.capacity} seats).`, to: `/organizer/registrations?event=${e.id}`, action: 'See registrations' }));
  const byEvent = {};
  myCertsPending.forEach((r) => { byEvent[r.eventId] = (byEvent[r.eventId] || 0) + 1; });
  Object.entries(byEvent).forEach(([eventId, count]) => attention.push({ key: `c${eventId}`, tone: 'info', text: `${count} ${count === 1 ? 'certificate is' : 'certificates are'} ready to issue for ${data.getEvent(eventId).title}.`, to: '/organizer/certificates', action: 'Issue certificates' }));

  const nextEvent = upcoming[0];

  return (
    <div className="dash-page">
      <div className="page-head page-head-row">
        <div>
          <h1>{greeting()}, {organizer.firstName}.</h1>
          <p>Manage your events, participants and campus activities from one place.</p>
        </div>
        <Button to="/organizer/events/create">Create event</Button>
      </div>


      <div className="grid grid-stats">
        <StatCard label="Events you manage" value={myEvents.length} note={`${myEvents.filter((e) => e.lifecycle === 'Completed').length} completed`} tone="primary" icon={CalendarDays} />
        <StatCard label="Upcoming events" value={upcoming.length} note={nextEvent ? `Next: ${formatDate(nextEvent.date)}` : 'None scheduled'} tone="secondary" icon={ClipboardList} />
        <StatCard label="Registrations" value={totalRegistrations.toLocaleString('en-IN')} note={`Across ${published.length} published events`} tone="warning" icon={Users} />
        <StatCard label="Attendance" value={attendance.marked ? `${attendance.rate}%` : '-'} note={attendance.marked ? `${attendance.present} of ${attendance.marked} marked present` : 'No attendance marked yet'} tone="success" icon={CheckCircle2} />
      </div>

      <div className="dash-grid">
        <section className="card panel panel-wide" aria-labelledby="needs-attention">
          <h2 id="needs-attention">Needs attention</h2>
          {attention.length === 0 ? (
            <p className="panel-sub">Nothing needs your attention right now.</p>
          ) : (
            <ul className="attention-list">
              {attention.map((a) => (
                <li key={a.key}>
                  <AlertTriangle size={18} aria-hidden="true" className={`attention-icon is-${a.tone}`} />
                  <span>{a.text}</span>
                  <Link to={a.to} className="text-link">{a.action}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card panel panel-wide" aria-labelledby="upcoming-events">
          <div className="panel-head">
            <h2 id="upcoming-events">Upcoming events</h2>
            <Link to="/organizer/events" className="text-link">All events</Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No upcoming events" text="Create an event and publish it when ready." actionLabel="Create event" actionTo="/organizer/events/create" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Event</th><th>Date</th><th>Venue</th><th>Status</th><th>Registrations</th><th>Capacity</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {upcoming.map((e) => (
                    <tr key={e.id}>
                      <td data-label="Event"><Link to={`/organizer/registrations?event=${e.id}`}>{e.title}</Link></td>
                      <td data-label="Date">{formatDate(e.date)}</td>
                      <td data-label="Venue">{e.venue}</td>
                      <td data-label="Status"><LifecycleBadge status={e.lifecycle} /></td>
                      <td data-label="Registrations">{e.registered}</td>
                      <td data-label="Capacity">{e.capacity}</td>
                      <td data-label="Action">
                        <div className="table-actions">
                          <Button size="sm" variant="outline" to="/organizer/events" state={{ preview: e.id }}>View</Button>
                          <Button size="sm" variant="outline" to={`/organizer/events/${e.id}/edit`}>Edit</Button>
                          <Button size="sm" variant="ghost" to={`/organizer/registrations?event=${e.id}`}>Manage</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card panel" aria-labelledby="fill-rate">
          <h2 id="fill-rate">Seats filled</h2>
          <p className="panel-sub">Registrations against capacity</p>
          {upcoming.length === 0 ? <p className="panel-sub">No upcoming events.</p> : (
            <ul className="bar-list">
              {upcoming.slice(0, 5).map((e) => (
                <li key={e.id}>
                  <div className="bar-list-head"><span>{e.title}</span><strong>{e.registered} / {e.capacity}</strong></div>
                  <ProgressBar value={e.registered} max={e.capacity} label={`${e.title} seats filled`} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card panel" aria-labelledby="att-situation">
          <h2 id="att-situation">Attendance</h2>
          <p className="panel-sub">Across all your events</p>
          {attendance.marked === 0 ? <p className="panel-sub">No attendance has been marked yet.</p> : (
            <DonutChart
              centerLabel={`${attendance.rate}%`}
              segments={[{ label: 'Present', value: attendance.present, color: 'var(--success)' }, { label: 'Absent', value: attendance.absent, color: 'var(--border-strong)' }]}
            />
          )}
          <Link to="/organizer/attendance" className="text-link panel-link">Open attendance</Link>
        </section>

        <section className="card panel panel-wide" aria-labelledby="fb-summary">
          <div className="panel-head">
            <h2 id="fb-summary">Feedback received</h2>
            <Link to="/organizer/feedback" className="text-link">See all feedback</Link>
          </div>
          {myFeedback.length === 0 ? <p className="panel-sub">No feedback yet. It appears after your events finish.</p> : (
            <div className="feedback-glance">
              <div className="rating-big"><Star size={22} aria-hidden="true" /><strong>{avgRating}</strong><span>average of {responses} {responses === 1 ? 'response' : 'responses'}</span></div>
              <ul className="simple-list">
                {myFeedback.map((f) => (
                  <li key={f.eventId}><span className="simple-title">{f.event.title}</span><span><StarDisplay value={Math.round(f.ratings.overall)} /> {f.ratings.overall}</span></li>
                ))}
              </ul>
            </div>
          )}
          <p className="panel-sub">Today is {formatDate(todayISO())}.</p>
        </section>
      </div>
    </div>
  );
}
