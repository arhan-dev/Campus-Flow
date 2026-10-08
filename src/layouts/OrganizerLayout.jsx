import { LayoutDashboard, CalendarDays, PlusCircle, ClipboardList, QrCode, Award, BarChart3, Megaphone, MessageSquare, User, Images, Layers } from 'lucide-react';
import DashboardLayout from './DashboardLayout';
import useCampusData from '../hooks/useCampusData';

const navItems = [
  { to: '/organizer/dashboard', label: 'Overview', icon: LayoutDashboard },
  { heading: 'Management' },
  { to: '/organizer/events', label: 'Events', icon: CalendarDays },
  { to: '/organizer/events/create', label: 'Create event', icon: PlusCircle },
  { to: '/organizer/registrations', label: 'Registrations', icon: ClipboardList },
  { to: '/organizer/attendance', label: 'Attendance', icon: QrCode },
  { to: '/organizer/clubs', label: 'Clubs', icon: Layers },
  { to: '/organizer/certificates', label: 'Certificates', icon: Award },
  { to: '/organizer/gallery', label: 'Gallery', icon: Images },
  { heading: 'Engagement' },
  { to: '/organizer/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/organizer/feedback', label: 'Feedback', icon: MessageSquare },
  { heading: 'Insights' },
  { to: '/organizer/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/organizer/profile', label: 'Profile', icon: User },
];

export default function OrganizerLayout() {
  const { organizer } = useCampusData();
  return (
    <DashboardLayout
      navItems={navItems}
      homePath="/organizer/dashboard"
      user={{ ...organizer, role: 'Event Organiser' }}
      profilePath="/organizer/profile"
      searchPath="/organizer/events"
    />
  );
}
