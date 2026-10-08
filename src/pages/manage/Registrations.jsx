import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Eye } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import EmptyState from '../../components/EmptyState';
import FilterBar, { FilterSelect } from '../../components/manage/FilterBar';
import { RegistrationBadge, AttendanceBadge, CertificateBadge } from '../../components/manage/StatusPills';
import useCampusData from '../../hooks/useCampusData';
import { formatDate } from '../../lib/dates';
import { useCatalog } from '../../context/DataContext';

const STATUSES = ['Confirmed', 'Waitlisted', 'Cancelled'];
const ATTENDANCE = [{ value: 'Present', label: 'Present' }, { value: 'Absent', label: 'Absent' }, { value: 'Pending', label: 'Not marked' }];

// Shared by event organiser (their own events) and admin (all events, with department and student filters).
export default function RegistrationsPage({ scope }) {
  const { departmentNames: DEPARTMENTS } = useCatalog();
  const isOrganizer = scope === 'organizer';
  const base = `/${scope}`;
  const data = useCampusData();
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [eventId, setEventId] = useState(params.get('event') || '');
  const [status, setStatus] = useState('');
  const [attendance, setAttendance] = useState('');
  const [department, setDepartment] = useState('');
  const [studentId, setStudentId] = useState('');
  const [detailKey, setDetailKey] = useState(null);
  const closeDetail = useCallback(() => setDetailKey(null), []);

  const scopedEvents = isOrganizer ? data.allEvents : data.myEvents;
  const scopedIds = useMemo(() => new Set(scopedEvents.map((e) => e.id)), [scopedEvents]);
  const rows = useMemo(() => data.registrations.filter((r) => scopedIds.has(r.eventId)), [data.registrations, scopedIds]);
  const eventOptions = scopedEvents.filter((e) => rows.some((r) => r.eventId === e.id)).map((e) => ({ value: String(e.id), label: e.title }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => (
      (!q || [r.student.name, r.event.title, r.student.department, isOrganizer ? r.student.id : ''].join(' ').toLowerCase().includes(q))
      && (!eventId || String(r.eventId) === eventId)
      && (!status || r.status === status)
      && (!attendance || r.attendance === attendance)
      && (!department || r.student.department === department)
      && (!studentId || r.studentId === studentId)
    ));
  }, [rows, search, eventId, status, attendance, department, studentId, isOrganizer]);

  const detail = rows.find((r) => r.key === detailKey);
  const clear = () => { setSearch(''); setEventId(''); setStatus(''); setAttendance(''); setDepartment(''); setStudentId(''); };
  const filteredEvent = eventId ? data.getEvent(eventId) : null;
  const canClear = Boolean(search || eventId || status || attendance || department || studentId);

  return (
    <div className="dash-page">
      <PageHeader
        homePath={`${base}/dashboard`}
        title={isOrganizer ? 'All registrations' : 'Registrations'}
        text={isOrganizer ? 'Registrations across every event.' : 'Students registered for your events.'}
        crumb="Registrations"
      />

      <FilterBar search={search} onSearch={setSearch} placeholder={isOrganizer ? 'Search student, event or department' : 'Search name, event or department'} searchLabel="Search registrations" canClear={canClear} onClear={clear}>
        <FilterSelect id="rg-event" label="Event" value={eventId} onChange={setEventId} options={eventOptions} allLabel="All events" />
        <FilterSelect id="rg-status" label="Status" value={status} onChange={setStatus} options={STATUSES} allLabel="All statuses" />
        <FilterSelect id="rg-att" label="Attendance" value={attendance} onChange={setAttendance} options={ATTENDANCE} allLabel="Any attendance" />
        {isOrganizer && <FilterSelect id="rg-dept" label="Department" value={department} onChange={setDepartment} options={DEPARTMENTS} allLabel="All departments" />}
        {isOrganizer && <FilterSelect id="rg-student" label="Student" value={studentId} onChange={setStudentId} options={data.students.map((s) => ({ value: s.id, label: s.name }))} allLabel="All students" />}
      </FilterBar>

      <section className="card panel" aria-label="Registration list">
        <div className="panel-head">
          <p className="result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'registration' : 'registrations'}{filteredEvent ? ` for ${filteredEvent.title}` : ''}</p>
          {filteredEvent && <Button size="sm" variant="outline" to={`/organizer/attendance?event=${filteredEvent.id}`}>Take attendance</Button>}
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No registrations yet" text="Registrations appear here once students sign up for approved events." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No registrations match" text="Try a different search or clear the filters." actionLabel="Clear filters" onAction={clear} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Student</th><th>Department</th><th>Event</th><th>Registered on</th><th>Status</th><th>Attendance</th><th>Certificate</th><th>Details</th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.key}>
                    <td data-label="Student"><strong>{r.student.name}</strong></td>
                    <td data-label="Department">{r.student.department}</td>
                    <td data-label="Event">{r.event.title}</td>
                    <td data-label="Registered on">{formatDate(r.registeredOn)}</td>
                    <td data-label="Status"><RegistrationBadge status={r.status} /></td>
                    <td data-label="Attendance"><AttendanceBadge status={r.attendance} /></td>
                    <td data-label="Certificate"><CertificateBadge status={r.certificate} /></td>
                    <td data-label="Details">
                      <Button size="sm" variant="outline" icon={Eye} onClick={() => setDetailKey(r.key)} aria-label={`Details for ${r.student.name}, ${r.event.title}`}>Details</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detail && (
        <Modal open title="Participant details" onClose={closeDetail} footer={<Button onClick={closeDetail}>Close</Button>}>
          <dl className="detail-list">
            <div><dt>Name</dt><dd>{detail.student.name}</dd></div>
            <div><dt>Department</dt><dd>{detail.student.department}</dd></div>
            <div><dt>Event</dt><dd>{detail.event.title}</dd></div>
            <div><dt>Registration status</dt><dd><RegistrationBadge status={detail.status} /></dd></div>
            <div><dt>Attendance</dt><dd><AttendanceBadge status={detail.attendance} /></dd></div>
            <div><dt>Certificate</dt><dd>{detail.certificate === 'Issued' ? `Issued (${detail.certificateType})` : <CertificateBadge status={detail.certificate} />}</dd></div>
          </dl>
          
        </Modal>
      )}
    </div>
  );
}
