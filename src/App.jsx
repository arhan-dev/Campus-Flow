import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import StudentLayout from './layouts/StudentLayout';
import OrganizerLayout from './layouts/OrganizerLayout';
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Login from './pages/Login';
import VerifyCertificate from './pages/VerifyCertificate';
import CheckIn from './pages/student/CheckIn';
import GalleryManager from './pages/manage/GalleryManager';
import PublicClubs from './pages/PublicClubs';
import About from './pages/About';
import StudentDashboard from './pages/student/Dashboard';
import OrganizerDashboard from './pages/organizer/Dashboard';
import RequireRole from './components/RequireRole';
import ResetPassword from './pages/ResetPassword';
import StudentEvents from './pages/student/Events';
import MyEvents from './pages/student/MyEvents';
import StudentCalendar from './pages/student/Calendar';
import Attendance from './pages/student/Attendance';
import Certificates from './pages/student/Certificates';
import Points from './pages/student/Points';
import Notifications from './pages/student/Notifications';
import Feedback from './pages/student/Feedback';
import Profile from './pages/student/Profile';
import Button from './components/Button';
import OrganizerEvents from './pages/organizer/Events';
import EventForm from './pages/organizer/EventForm';
import OrganizerAttendance from './pages/organizer/Attendance';
import OrganizerCertificates from './pages/organizer/Certificates';
import OrganizerFeedback from './pages/organizer/Feedback';
import OrganizerAnalytics from './pages/organizer/Analytics';
import OrganizerClubs from './pages/organizer/Clubs';
import RegistrationsPage from './pages/manage/Registrations';
import AnnouncementsPage from './pages/manage/Announcements';
import ProfilePage from './pages/manage/Profile';
import ManageNotFound from './pages/manage/NotFound';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="placeholder">
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist or has moved.</p>
      <Button to="/">Back to home</Button>
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/verify-certificate" element={<VerifyCertificate />} />
          <Route path="/verify-certificate/:code" element={<VerifyCertificate />} />
          <Route path="/clubs" element={<PublicClubs />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<RequireRole role="student" />}>
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="events" element={<StudentEvents />} />
            <Route path="my-events" element={<MyEvents />} />
            <Route path="registered" element={<Navigate to="/student/my-events" replace />} />
            <Route path="calendar" element={<StudentCalendar />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="check-in" element={<CheckIn />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="points" element={<Points />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        <Route element={<RequireRole role="organizer" />}>
          <Route path="/organizer" element={<OrganizerLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<OrganizerDashboard />} />
            <Route path="events" element={<OrganizerEvents />} />
            <Route path="events/create" element={<EventForm scope="organizer" />} />
            <Route path="create-event" element={<Navigate to="/organizer/events/create" replace />} />
            <Route path="events/:id/edit" element={<EventForm scope="organizer" />} />
            <Route path="registrations" element={<RegistrationsPage scope="organizer" />} />
            <Route path="attendance" element={<OrganizerAttendance />} />
            <Route path="certificates" element={<OrganizerCertificates />} />
            <Route path="announcements" element={<AnnouncementsPage scope="organizer" />} />
            <Route path="gallery" element={<GalleryManager scope="organizer" />} />
            <Route path="feedback" element={<OrganizerFeedback />} />
            <Route path="analytics" element={<OrganizerAnalytics />} />
            <Route path="clubs" element={<OrganizerClubs />} />
            <Route path="profile" element={<ProfilePage scope="organizer" />} />
            <Route path="*" element={<ManageNotFound home="/organizer/dashboard" />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
