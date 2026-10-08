import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, CheckCircle2, Award, Star, Calendar, MapPin, Clock, CalendarX } from 'lucide-react';
import StatCard from '../../components/StatCard';
import Tabs from '../../components/Tabs';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import EventVisual from '../../components/EventVisual';
import MiniBarChart from '../../components/MiniBarChart';
import StudentEventList from '../../components/StudentEventList';
import useStudentData from '../../hooks/useStudentData';
import { daysFromToday, formatDate } from '../../lib/dates';

const MONTHS = [{ label: 'Apr', month: 3 }, { label: 'May', month: 4 }, { label: 'Jun', month: 5 }, { label: 'Jul', month: 6 }, { label: 'Aug', month: 7 }, { label: 'Sep', month: 8 }];
const TABS = ['Upcoming', 'Registered', 'Completed'];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function dueText(days) {
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export default function StudentDashboard() {
  const data = useStudentData();
  const { student, registrations, upcoming, completed, attendance, attendedIds, certificates, totalPoints, notifications, unreadCount, activity: allActivity } = data;
  const [tab, setTab] = useState('Upcoming');

  const next = upcoming[0];
  const tabLists = { Upcoming: upcoming, Registered: registrations, Completed: completed };
  const shown = tabLists[tab].slice(0, 4);

  const attendedCount = attendance.filter((a) => a.status === 'Present').length;
  const chartValues = MONTHS.map(({ month }) => attendance.filter((a) => a.status === 'Present' && new Date(`${a.event.date}T00:00:00Z`).getUTCMonth() === month).length);

  const activity = allActivity.slice(0, 5);

  const stats = [
    { label: 'Registered events', value: String(registrations.length), note: `${upcoming.length} upcoming`, tone: 'primary', icon: Ticket },
    { label: 'Attended', value: String(attendedCount), note: `${completed.length} events completed`, tone: 'success', icon: CheckCircle2 },
    { label: 'Certificates', value: String(certificates.length), note: 'Issued to you', tone: 'warning', icon: Award },
    { label: 'Participation points', value: String(totalPoints), note: `From ${data.points.length} events`, tone: 'secondary', icon: Star },
  ];

  return (
    <div className="dash-page">
      <div className="page-head">
        <h1>{greeting()}, {student.firstName}!</h1>
        <p>Here's what's happening with your campus activities.</p>
      </div>

      <div className="grid grid-stats">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>
      
      <div className="dash-grid">
        <section className="card panel panel-wide" aria-labelledby="next-heading">
          <h2 id="next-heading">Happening next</h2>
          {next ? (
            <div className="spotlight">
              <EventVisual image={next.event.image} />
              <div className="spotlight-info">
                <div className="spotlight-badges">
                  <Badge variant={next.event.category.toLowerCase()}>{next.event.category}</Badge>
                  <Badge variant="approved" dot>Registered</Badge>
                  <span className="spotlight-due">{dueText(daysFromToday(next.event.date))}</span>
                </div>
                <h3>{next.event.title}</h3>
                <ul className="event-meta">
                  <li><Calendar size={16} aria-hidden="true" /> {formatDate(next.event.date)}</li>
                  <li><Clock size={16} aria-hidden="true" /> {next.event.time}</li>
                  <li><MapPin size={16} aria-hidden="true" /> {next.event.venue}</li>
                </ul>
                <Button to={`/events/${next.event.id}`}>View Event</Button>
              </div>
            </div>
          ) : (
            <EmptyState icon={CalendarX} title="No upcoming events" text="You haven't registered for any upcoming events yet." actionLabel="Explore Events" actionTo="/student/events" />
          )}
        </section>

        <section className="card panel panel-wide" aria-labelledby="myevents-heading">
          <div className="panel-head">
            <h2 id="myevents-heading">My events</h2>
            <Tabs tabs={TABS} active={tab} onChange={setTab} label="My events" />
          </div>
          {shown.length > 0 ? (
            <>
              <StudentEventList registrations={shown} attendedIds={attendedIds} compact />
              <Link to="/student/my-events" className="text-link panel-link">View all my events</Link>
            </>
          ) : (
            <EmptyState icon={CalendarX} title={`No ${tab.toLowerCase()} events`} text="Nothing to show here yet." actionLabel="Explore Events" actionTo="/student/events" />
          )}
        </section>

        <section className="card panel" aria-labelledby="part-heading">
          <h2 id="part-heading">Participation overview</h2>
          <p className="panel-sub">Events attended per month</p>
          <MiniBarChart labels={MONTHS.map((m) => m.label)} values={chartValues} />
        </section>

        <section className="card panel" aria-labelledby="act-heading">
          <h2 id="act-heading">Recent activity</h2>
          <ul className="activity-list">
            {activity.map((a) => (
              <li key={a.id}>
                <span className="activity-dot" aria-hidden="true" />
                <div><p>{a.text}</p><span>{formatDate(a.date)}</span></div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card panel" aria-labelledby="cert-heading">
          <h2 id="cert-heading">Certificates</h2>
          <ul className="simple-list">
            {certificates.slice(0, 3).map((c) => (
              <li key={c.id}><span>{c.event.title}</span><Badge variant={c.type === 'Participation' ? 'neutral' : 'approved'}>{c.type}</Badge></li>
            ))}
          </ul>
          <Link to="/student/certificates" className="text-link panel-link">View all certificates</Link>
        </section>

        <section className="card panel" aria-labelledby="notif-heading">
          <div className="panel-head">
            <h2 id="notif-heading">Notifications</h2>
            {unreadCount > 0 && <Badge variant="pending">{unreadCount} unread</Badge>}
          </div>
          {notifications.length > 0 ? (
            <ul className="activity-list">
              {notifications.slice(0, 3).map((n) => (
                <li key={n.id}>
                  <span className={`activity-dot ${n.unread ? 'is-unread' : ''}`} aria-hidden="true" />
                  <div><p><strong>{n.title}</strong></p><p>{n.text}</p><span>{n.time}</span></div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-sub">No notifications</p>
          )}
          <Link to="/student/notifications" className="text-link panel-link">Open notification centre</Link>
        </section>
      </div>
    </div>
  );
}
