import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QrCode, UserCheck, UserX, Save, CheckCheck, BarChart3, Power, RefreshCw } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import Tabs from '../../components/Tabs';
import StatCard from '../../components/StatCard';
import EmptyState from '../../components/EmptyState';
import Toast from '../../components/Toast';
import InfoNote from '../../components/manage/InfoNote';
import { AttendanceBadge } from '../../components/manage/StatusPills';
import useToast from '../../hooks/useToast';
import useCampusData from '../../hooks/useCampusData';
import { saveAttendance } from '../../services/campusService';
import { formatDate, todayISO } from '../../lib/dates';
import { encodeQr, qrPath } from '../../lib/qr';
import { ATTENDANCE_SESSION_MINUTES } from '../../lib/constants';
import { fetchOpenSession, openAttendanceSession, closeAttendanceSession, checkInUrl, formatCode } from '../../services/attendanceService';

const TABS = ['Manual attendance', 'QR attendance'];

// Manual attendance (Section 6) plus QR attendance: the QR holds a link with a secret session code. Students open it,
// and the database checks the student, registration, event and session before marking anyone present.
export default function OrganizerAttendance() {
  const data = useCampusData();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(TABS[0]);
  const [toast, showToast, closeToast] = useToast();

  const options = useMemo(() => {
    const withRoster = data.myEvents.filter((e) => data.rosterFor(e.id).length > 0);
    const upcoming = withRoster.filter((e) => e.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date));
    const past = withRoster.filter((e) => e.date < todayISO()).sort((a, b) => b.date.localeCompare(a.date));
    return [...upcoming, ...past];
  }, [data]);

  const initial = options.find((e) => String(e.id) === params.get('event')) || options[0];
  const [pickedId, setPickedId] = useState(initial ? initial.id : null);
  const [marks, setMarks] = useState({}); // unsaved changes: { studentId: status }

  // Fall back to the first available event if the picked one is not (or no longer) in the list
  const eventId = options.some((e) => e.id === pickedId) ? pickedId : options[0]?.id ?? null;
  const event = eventId ? data.getEvent(eventId) : null;
  const roster = event ? data.rosterFor(event.id) : [];
  const statusOf = (r) => marks[r.studentId] ?? r.attendance;
  const present = roster.filter((r) => statusOf(r) === 'Present').length;
  const absent = roster.filter((r) => statusOf(r) === 'Absent').length;
  const unmarked = roster.length - present - absent;
  const rate = roster.length ? Math.round((present / roster.length) * 100) : 0;
  const changeCount = Object.keys(marks).filter((id) => roster.find((r) => r.studentId === id && r.attendance !== marks[id])).length;

  const mark = (studentId, status) => setMarks((m) => ({ ...m, [studentId]: status }));
  const markAll = () => setMarks(Object.fromEntries(roster.map((r) => [r.studentId, 'Present'])));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await saveAttendance(event.id, marks);
      await data.refresh();
      setMarks({});
      showToast('Attendance saved.');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  const changeEvent = (id) => { setPickedId(id); setMarks({}); };

  // ----- QR session -----
  const [session, setSession] = useState(null);
  const [sessionState, setSessionState] = useState('idle'); // idle | loading | error
  const [minutes, setMinutes] = useState(120);
  const [qrBusy, setQrBusy] = useState(false);
  const loadSession = useCallback(async () => {
    if (!eventId) return;
    setSessionState('loading');
    try { setSession(await fetchOpenSession(eventId)); setSessionState('idle'); } catch (e) { setSession(null); setSessionState(e.message); }
  }, [eventId]);
  useEffect(() => { if (tab === TABS[1]) loadSession(); }, [tab, loadSession]);
  // While a session is open keep the roster fresh (realtime also refreshes it when a student checks in)
  useEffect(() => {
    if (tab !== TABS[1] || !session) return undefined;
    const t = setInterval(() => data.refresh(), 15000);
    return () => clearInterval(t);
  }, [tab, session, data]);
  const startSession = async () => {
    setQrBusy(true);
    try { const created = await openAttendanceSession(eventId, minutes); setSession({ ...created }); showToast('QR attendance is open.'); } catch (e) { showToast(e.message, 'error'); } finally { setQrBusy(false); }
  };
  const stopSession = async () => {
    setQrBusy(true);
    try { await closeAttendanceSession(eventId); setSession(null); showToast('QR attendance closed.'); } catch (e) { showToast(e.message, 'error'); } finally { setQrBusy(false); }
  };
  const expired = session && new Date(session.expires_at).getTime() <= Date.now();
  const qr = useMemo(() => (session ? encodeQr(checkInUrl(session.code)) : null), [session]);

  if (options.length === 0 || !event) {
    return (
      <div className="dash-page">
        <PageHeader homePath="/organizer/dashboard" title="Attendance" crumb="Attendance" />
        <EmptyState icon={QrCode} title="No attendance to manage yet" text="Attendance opens for approved events that have registered participants." actionLabel="Go to my events" actionTo="/organizer/events" />
      </div>
    );
  }

  return (
    <div className="dash-page">
      <PageHeader homePath="/organizer/dashboard" title="Attendance" text="Mark who attended your events." crumb="Attendance" />
      <InfoNote>Mark attendance manually (saved when you press Save attendance) or open QR attendance so students check themselves in. Both write to the same attendance records.</InfoNote>

      <div className="card panel select-panel">
        <div className="field">
          <label htmlFor="att-event">Select event</label>
          <select id="att-event" value={eventId} onChange={(e) => changeEvent(e.target.value)}>
            {options.map((e) => <option key={e.id} value={e.id}>{e.title} ({formatDate(e.date)})</option>)}
          </select>
        </div>
        <Tabs tabs={TABS} active={tab} onChange={setTab} label="Attendance method" />
      </div>

      {tab === TABS[0] ? (
        <>
          <div className="grid grid-stats">
            <StatCard label="Total registered" value={roster.length} note="Confirmed registrations" tone="primary" icon={UserCheck} />
            <StatCard label="Present" value={present} tone="success" icon={CheckCheck} />
            <StatCard label="Absent" value={absent} note={unmarked > 0 ? `${unmarked} not marked yet` : 'Everyone is marked'} tone="warning" icon={UserX} />
            <StatCard label="Attendance rate" value={`${rate}%`} note={changeCount > 0 ? 'Includes unsaved changes' : `${present} of ${roster.length} present`} tone="secondary" icon={BarChart3} />
          </div>

          <section className="card panel" aria-label="Participant list">
            <div className="panel-head">
              <h2>{event.title}</h2>
              <div className="head-actions">
                <Button variant="outline" icon={CheckCheck} onClick={markAll}>Mark All Present</Button>
                <Button icon={Save} onClick={save} disabled={changeCount === 0 || saving}>{saving ? 'Saving...' : 'Save Attendance'}</Button>
              </div>
            </div>
            {changeCount > 0 && <p className="unsaved-note" role="status">{changeCount} unsaved {changeCount === 1 ? 'change' : 'changes'}. Press Save Attendance to keep them.</p>}
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Participant</th><th>Department</th><th>Status</th><th>Method</th><th>Mark</th></tr></thead>
                <tbody>
                  {roster.map((r) => {
                    const status = statusOf(r);
                    return (
                      <tr key={r.key}>
                        <td data-label="Participant"><strong>{r.student.name}</strong></td>
                        <td data-label="Department">{r.student.department}</td>
                        <td data-label="Status"><AttendanceBadge status={status} /></td>
                        <td data-label="Method">{r.attendanceMethod || <span className="row-muted">-</span>}</td>
                        <td data-label="Mark">
                          <div className="segmented" role="group" aria-label={`Attendance for ${r.student.name}`}>
                            <button type="button" className={status === 'Present' ? 'is-on is-present' : ''} aria-pressed={status === 'Present'} onClick={() => mark(r.studentId, 'Present')}>Present</button>
                            <button type="button" className={status === 'Absent' ? 'is-on is-absent' : ''} aria-pressed={status === 'Absent'} onClick={() => mark(r.studentId, 'Absent')}>Absent</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="card panel qr-panel" aria-label="QR attendance">
            <div className="panel-head">
              <h2>QR attendance</h2>
              {session && !expired ? <Badge variant="open" dot>Open</Badge> : <Badge variant="neutral">Closed</Badge>}
            </div>
            {sessionState !== 'idle' && sessionState !== 'loading' && <p className="form-error" role="alert">{sessionState}</p>}
            {sessionState === 'loading' && <p className="panel-sub" role="status">Loading...</p>}
            {session ? (
              <div className="qr-live">
                <div className="qr-box" role="img" aria-label={`QR code for attendance, code ${formatCode(session.code)}`}>
                  <svg viewBox={`0 0 ${qr.size + 8} ${qr.size + 8}`} shapeRendering="crispEdges"><rect width="100%" height="100%" fill="#fff" /><path d={qrPath(qr, 4)} fill="#000" /></svg>
                </div>
                <div className="qr-info">
                  <p className="panel-sub">Students open <strong>QR check-in</strong> in CampusFlow and scan this code, or type:</p>
                  <p className="qr-code mono">{formatCode(session.code)}</p>
                  <p className="panel-sub">{expired ? 'This code has expired. Start a new session.' : `Valid until ${new Date(session.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`} Only registered students can check in, once each.</p>
                  <div className="head-actions">
                    <Button variant="danger" icon={Power} onClick={stopSession} disabled={qrBusy}>Close check-in</Button>
                    <Button variant="outline" icon={RefreshCw} onClick={startSession} disabled={qrBusy}>New code</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="qr-start">
                <p className="panel-sub">QR attendance can be opened on the day of the event, until it ends. Opening it creates a secret code; it expires automatically.</p>
                <div className="field">
                  <label htmlFor="qr-minutes">Open for</label>
                  <select id="qr-minutes" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
                    {ATTENDANCE_SESSION_MINUTES.map((m) => <option key={m} value={m}>{m >= 60 ? `${m / 60} ${m === 60 ? 'hour' : 'hours'}` : `${m} minutes`}</option>)}
                  </select>
                </div>
                <Button icon={QrCode} onClick={startSession} disabled={qrBusy}>{qrBusy ? 'Starting...' : 'Start QR attendance'}</Button>
              </div>
            )}
          </section>
          <section className="card panel" aria-label="Check-in progress">
            <div className="panel-head"><h2>Check-ins for {event.title}</h2><span className="panel-sub">{present} of {roster.length} present</span></div>
            <ul className="simple-list">
              {roster.filter((r) => statusOf(r) === 'Present').map((r) => <li key={r.key}><span>{r.student.name}</span><Badge variant="present" dot>{r.attendanceMethod || 'Present'}</Badge></li>)}
            </ul>
            {present === 0 && <p className="panel-sub">No one is checked in yet.</p>}
          </section>
        </>
      )}
      <Toast message={toast} onDone={closeToast} />
    </div>
  );
}
