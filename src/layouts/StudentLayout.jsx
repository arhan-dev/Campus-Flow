import { LayoutDashboard, CalendarDays, Ticket, Calendar, QrCode, ScanLine, Award, Star, Bell, MessageSquare, User } from 'lucide-react';
import DashboardLayout from './DashboardLayout';
import useStudentData from '../hooks/useStudentData';

const navItems = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/events', label: 'Events', icon: CalendarDays },
  { to: '/student/my-events', label: 'My events', icon: Ticket },
  { to: '/student/calendar', label: 'Calendar', icon: Calendar },
  { to: '/student/attendance', label: 'Attendance', icon: QrCode },
  { to: '/student/check-in', label: 'QR check-in', icon: ScanLine },
  { to: '/student/certificates', label: 'Certificates', icon: Award },
  { to: '/student/points', label: 'Participation', icon: Star },
  { to: '/student/notifications', label: 'Notifications', icon: Bell },
  { to: '/student/feedback', label: 'Feedback', icon: MessageSquare },
  { to: '/student/profile', label: 'Profile', icon: User },
];

export default function StudentLayout() {
  const { student } = useStudentData();
  return (
    <DashboardLayout
      navItems={navItems}
      homePath="/student/dashboard"
      user={{ ...student, role: student.roleLabel || 'Student' }}
      profilePath="/student/profile"
      searchPath="/student/events"
      notificationsPath="/student/notifications"
    />
  );
}
