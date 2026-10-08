// SEED SOURCE ONLY. This file is read by scripts/generate-seed.mjs to produce supabase/seed.sql.
// The application itself does NOT import it any more: it reads events from Supabase.
// All data in this file is fictional and only used for the Section 1 frontend demo.
// In later sections this will be replaced with real data from the backend.

export const CATEGORY_LIST = ['Technical', 'Cultural', 'Sports', 'Workshop', 'Hackathon', 'Competition', 'Seminar'];

export const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Business Studies',
  'Arts & Design',
  'Physical Education',
];

// "image" is a visual key. EventVisual turns it into a coloured artwork with an icon.
// "schedule" ([time, activity] pairs), "rules" and "prizes" are optional. The details page hides any section an event does not have.
export const events = [
  { id: 1, title: 'TechFest 2026', category: 'Technical', description: 'The flagship technology festival of the campus with project expos, tech talks and live demos from student teams.', date: '2026-10-12', time: '10:00 AM', venue: 'Main Auditorium', organizer: 'Technical Council', department: 'Computer Science', capacity: 200, registered: 124, status: 'Open', registrationDeadline: '2026-10-10', image: 'technical',
    schedule: [["10:00 AM", "Inauguration and welcome"], ["11:00 AM", "Project expo opens"], ["1:00 PM", "Lunch break"], ["2:30 PM", "Tech talks"], ["4:30 PM", "Awards and closing"]],
    rules: ["Carry your college ID card.", "Teams can have up to 4 members.", "Projects must be original work.", "Judges' decisions are final."],
    prizes: ["Best project: ₹15,000", "Runner-up: ₹8,000", "Best innovation: ₹5,000"],
  },
  { id: 2, title: 'AI & Machine Learning Workshop', category: 'Workshop', description: 'A hands-on session on building and evaluating your first machine learning model with Python.', date: '2026-10-15', time: '2:00 PM', venue: 'Seminar Hall B', organizer: 'AI/ML Club', department: 'Information Technology', capacity: 80, registered: 62, status: 'Open', registrationDeadline: '2026-10-13', image: 'workshop',
    schedule: [["2:00 PM", "Introduction to machine learning"], ["2:45 PM", "Hands-on: training your first model"], ["4:00 PM", "Tea break"], ["4:15 PM", "Evaluating and improving models"], ["5:00 PM", "Questions and wrap-up"]],
    rules: ["Bring a laptop with Python installed.", "Only registered participants can attend."],
  },
  { id: 3, title: 'Inter-College Hackathon', category: 'Hackathon', description: 'A 24-hour hackathon where teams from nearby colleges build solutions for real campus problems.', date: '2026-10-18', time: '9:00 AM', venue: 'Innovation Lab', organizer: 'Coding Club', department: 'Computer Science', capacity: 150, registered: 150, status: 'Full', registrationDeadline: '2026-10-15', image: 'hackathon',
    schedule: [["9:00 AM", "Team check-in"], ["10:00 AM", "Problem statements announced"], ["10:30 AM", "Hacking begins"], ["Next day, 9:00 AM", "Submissions close"], ["Next day, 11:00 AM", "Demos and results"]],
    rules: ["Teams of 2 to 4 members.", "All code must be written during the event.", "Open-source libraries are allowed.", "Every team must present a working demo."],
    prizes: ["First place: ₹30,000", "Second place: ₹15,000", "Best campus impact idea: ₹10,000"],
  },
  { id: 4, title: 'Annual Sports Meet', category: 'Sports', description: 'Three days of track, field and team events with participation from every department.', date: '2026-10-22', time: '8:30 AM', venue: 'Central Sports Ground', organizer: 'Sports Committee', department: 'Physical Education', capacity: 500, registered: 318, status: 'Open', registrationDeadline: '2026-10-19', image: 'sports',
    schedule: [["8:30 AM", "Team check-in"], ["9:30 AM", "Opening march past"], ["10:30 AM", "Track and field heats"], ["2:00 PM", "Team event finals"], ["4:30 PM", "Medal ceremony"]],
    rules: ["Wear proper sports attire and shoes.", "Report 30 minutes before your event.", "Referee decisions are final."],
    prizes: ["Medals for the top three in each event", "Overall department trophy"],
  },
  { id: 5, title: 'Cultural Night', category: 'Cultural', description: 'An evening of music, dance and drama performed by students from across the campus.', date: '2026-10-25', time: '6:00 PM', venue: 'Open Air Theatre', organizer: 'Cultural Committee', department: 'Arts & Design', capacity: 400, registered: 276, status: 'Open', registrationDeadline: '2026-10-23', image: 'cultural',
    schedule: [["5:30 PM", "Gates open"], ["6:00 PM", "Opening performance"], ["6:30 PM", "Group performances"], ["8:00 PM", "Solo showcase"], ["9:15 PM", "Closing and acknowledgements"]],
    rules: ["Each act is limited to 8 minutes.", "Submit music tracks one day before the event.", "Bring your own props and costumes."],
    prizes: ["Best performance award", "Audience favourite award"],
  },
  { id: 6, title: 'Cyber Security Seminar', category: 'Seminar', description: 'Industry speakers explain modern threats, safe coding habits and careers in cyber security.', date: '2026-10-28', time: '11:00 AM', venue: 'Lecture Hall 3', organizer: 'Cyber Security Cell', department: 'Information Technology', capacity: 120, registered: 74, status: 'Open', registrationDeadline: '2026-10-26', image: 'seminar',
    schedule: [["11:00 AM", "Welcome address"], ["11:15 AM", "Keynote on modern cyber threats"], ["12:15 PM", "Panel discussion"], ["1:00 PM", "Audience questions"]],
    rules: ["Take your seat 15 minutes early.", "Keep mobile phones on silent."],
  },
  { id: 7, title: 'Coding Competition', category: 'Competition', description: 'Solve algorithmic problems against the clock in this individual competitive programming contest.', date: '2026-11-02', time: '10:30 AM', venue: 'Computer Lab 2', organizer: 'Coding Club', department: 'Computer Science', capacity: 100, registered: 100, status: 'Full', registrationDeadline: '2026-10-30', image: 'competition',
    schedule: [["10:30 AM", "Rules briefing"], ["11:00 AM", "Round 1"], ["12:30 PM", "Break"], ["1:30 PM", "Final round"], ["3:00 PM", "Results announced"]],
    rules: ["Individual participation only.", "No mobile phones during the rounds.", "Bring your college ID card.", "Malpractice leads to disqualification."],
    prizes: ["First place: ₹6,000", "Second place: ₹4,000", "Third place: ₹2,000"],
  },
  { id: 8, title: 'Entrepreneurship Summit', category: 'Seminar', description: 'Founders and investors share lessons on turning student ideas into real startups.', date: '2026-11-06', time: '9:30 AM', venue: 'Convention Centre', organizer: 'E-Cell', department: 'Business Studies', capacity: 250, registered: 141, status: 'Open', registrationDeadline: '2026-11-04', image: 'seminar',
    schedule: [["9:30 AM", "Registration and welcome"], ["10:00 AM", "Opening keynote"], ["11:30 AM", "Founders' panel"], ["1:00 PM", "Lunch break"], ["2:00 PM", "Student startup showcase"], ["4:00 PM", "Closing remarks"]],
    rules: ["Carry your college ID card.", "Entry is only for registered participants."],
  },
  { id: 9, title: 'Robotics Workshop', category: 'Workshop', description: 'Build and program a line-following robot in a single afternoon with guided mentors.', date: '2026-11-09', time: '1:00 PM', venue: 'Robotics Lab', organizer: 'Robotics Club', department: 'Electronics', capacity: 60, registered: 48, status: 'Open', registrationDeadline: '2026-11-07', image: 'workshop',
    schedule: [["1:00 PM", "Introduction to the robot kit"], ["1:45 PM", "Building the chassis and wiring"], ["3:15 PM", "Programming the line follower"], ["4:30 PM", "Test runs"]],
    rules: ["Work in teams of 2.", "Kits are provided and must be returned at the end."],
  },
  { id: 10, title: 'Photography Competition', category: 'Competition', description: 'Students submitted photographs on the theme "Campus in Motion". Winners were announced at the gallery.', date: '2026-09-15', time: '10:00 AM', venue: 'Art Gallery Corridor', organizer: 'Photography Club', department: 'Arts & Design', capacity: 90, registered: 84, status: 'Completed', registrationDeadline: '2026-09-10', image: 'competition',
    rules: ["Photographs must follow the theme \"Campus in Motion\".", "One entry per participant.", "Only minor editing such as cropping and exposure is allowed."],
    prizes: ["First place: ₹3,000", "Second place: ₹2,000", "Third place: ₹1,000"],
  },
  { id: 11, title: 'Web Development Bootcamp', category: 'Workshop', description: 'A practical bootcamp covering HTML, CSS and React by building a small event website together.', date: '2026-11-14', time: '10:00 AM', venue: 'Computer Lab 1', organizer: 'Coding Club', department: 'Computer Science', capacity: 70, registered: 35, status: 'Open', registrationDeadline: '2026-11-12', image: 'workshop',
    schedule: [["10:00 AM", "HTML and CSS basics"], ["11:30 AM", "JavaScript fundamentals"], ["1:00 PM", "Lunch break"], ["2:00 PM", "Building a small site with React"], ["4:00 PM", "Demo and feedback"]],
    rules: ["Bring a laptop and charger.", "Install Node.js and VS Code before the day."],
  },
  { id: 12, title: 'Inter-Department Football League', category: 'Sports', description: 'Departments compete in a knockout football league played over two weekends.', date: '2026-11-20', time: '4:00 PM', venue: 'Football Ground', organizer: 'Sports Committee', department: 'Physical Education', capacity: 220, registered: 132, status: 'Open', registrationDeadline: '2026-11-17', image: 'sports',
    schedule: [["3:30 PM", "Team reporting"], ["4:00 PM", "First match kick-off"], ["5:30 PM", "Second match kick-off"]],
    rules: ["Each department fields one team.", "Squads can have up to 15 players.", "Wear a team jersey and shin guards.", "Referee decisions are final."],
    prizes: ["Champions: trophy", "Runners-up: trophy"],
  },
  { id: 13, title: 'Battle of Bands', category: 'Cultural', description: 'Student bands perform original and cover sets, judged by local musicians.', date: '2026-12-05', time: '6:30 PM', venue: 'Open Air Theatre', organizer: 'Music Club', department: 'Arts & Design', capacity: 300, registered: 190, status: 'Open', registrationDeadline: '2026-12-02', image: 'cultural',
    schedule: [["6:00 PM", "Gates open"], ["6:30 PM", "Opening and sound check"], ["7:00 PM", "Band performances"], ["9:00 PM", "Judges' results"]],
    rules: ["Each band gets a 20-minute set.", "Bands can have up to 6 members.", "Bring your own instruments. A drum kit is provided."],
    prizes: ["First place: ₹10,000", "Second place: ₹5,000"],
  },
  // Past events. The demo student attended these (see attendanceRecords below).
  { id: 14, title: 'Python Programming Workshop', category: 'Workshop', description: 'A beginner-friendly workshop on Python basics, taught through small hands-on exercises.', date: '2026-08-22', time: '10:00 AM', venue: 'Computer Lab 1', organizer: 'Computer Science Society', department: 'Computer Science', capacity: 60, registered: 57, status: 'Completed', registrationDeadline: '2026-08-19', image: 'workshop' },
  { id: 15, title: 'Campus Code Sprint', category: 'Hackathon', description: 'A 12-hour team build challenge where students prototyped ideas for everyday campus problems.', date: '2026-07-26', time: '9:00 AM', venue: 'Innovation Lab', organizer: 'Computer Science Society', department: 'Computer Science', capacity: 100, registered: 92, status: 'Completed', registrationDeadline: '2026-07-23', image: 'hackathon' },
  { id: 16, title: "Freshers' Welcome Fest", category: 'Cultural', description: 'A welcome evening of performances and games for first-year students, run by student volunteers.', date: '2026-08-30', time: '5:00 PM', venue: 'Open Air Theatre', organizer: 'Cultural Committee', department: 'Arts & Design', capacity: 350, registered: 310, status: 'Completed', registrationDeadline: '2026-08-27', image: 'cultural' },
  { id: 17, title: 'Inter-Department Quiz', category: 'Competition', description: 'A general knowledge and campus trivia quiz played between department teams.', date: '2026-09-05', time: '11:00 AM', venue: 'Lecture Hall 2', organizer: 'Literary Club', department: 'Arts & Design', capacity: 80, registered: 72, status: 'Completed', registrationDeadline: '2026-09-02', image: 'competition' },
  { id: 18, title: 'Career Guidance Seminar', category: 'Seminar', description: 'A session on internships, placements and planning a career path, led by the placement cell.', date: '2026-09-26', time: '11:00 AM', venue: 'Lecture Hall 3', organizer: 'Training and Placement Cell', department: 'Business Studies', capacity: 150, registered: 128, status: 'Completed', registrationDeadline: '2026-09-23', image: 'seminar' },
];

// ---------- Date helpers (always use UTC so dates never shift by timezone) ----------
export function formatDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function dateParts(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return {
    day: d.toLocaleDateString('en-GB', { day: 'numeric', timeZone: 'UTC' }),
    month: d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }),
  };
}

export function getUpcomingEvents(limit) {
  const list = events.filter((e) => e.status !== 'Completed').sort((a, b) => a.date.localeCompare(b.date));
  return limit ? list.slice(0, limit) : list;
}

// ---------- People ----------
// The one demo student. Every student page reads this object.
export const currentStudent = {
  name: 'Rahul Sharma',
  firstName: 'Rahul',
  role: 'Student',
  department: 'Computer Science',
  year: '3rd Year',
  email: 'rahul.demo@campusflow.example', // fictional demo address
  studentId: 'DEMO-0001', // placeholder, not a real ID
  detail: 'Computer Science, 3rd year',
};
export const currentFaculty = { name: 'Dr. Meera Iyer', firstName: 'Meera', role: 'Faculty', detail: 'Department of Computer Science' };
export const currentAdmin = { name: 'Prof. Arun Nair', firstName: 'Arun', role: 'Administrator', detail: 'Campus events office' };

// ---------- Notifications ----------
// "type" picks the icon. "link" is the page the notification points to.
export const notifications = [
  { id: 1, type: 'registration', title: 'Registration confirmed', text: 'You are registered for TechFest 2026.', time: '10 min ago', unread: true, link: '/events/1' },
  { id: 2, type: 'schedule', title: 'Schedule updated', text: 'AI & Machine Learning Workshop now starts at 2:00 PM.', time: '1 hour ago', unread: true, link: '/events/2' },
  { id: 3, type: 'certificate', title: 'Certificate ready', text: 'Your Photography Competition certificate is available.', time: 'Yesterday', unread: true, link: '/student/certificates' },
  { id: 5, type: 'feedback', title: 'Feedback requested', text: 'Tell us how the Career Guidance Seminar went.', time: '3 days ago', unread: true, link: '/student/feedback' },
  { id: 4, type: 'event', title: 'New event in your department', text: 'Web Development Bootcamp is open for registration.', time: '2 days ago', unread: false, link: '/events/11' },
];

// ---------- Student data (demo) ----------
// Everything below refers to events by id. Event details always come from the "events" list.
export const DEMO_TODAY = '2026-09-30';

// The student's registrations. 2 upcoming + 6 past = 8 registered events.
export const studentRegistrations = [
  { eventId: 1, registeredOn: '2026-09-29' },
  { eventId: 2, registeredOn: '2026-09-27' },
  { eventId: 18, registeredOn: '2026-09-20' },
  { eventId: 10, registeredOn: '2026-09-05' },
  { eventId: 17, registeredOn: '2026-08-30' },
  { eventId: 16, registeredOn: '2026-08-20' },
  { eventId: 14, registeredOn: '2026-08-15' },
  { eventId: 15, registeredOn: '2026-07-15' },
];

// Attendance for events that have already happened. Upcoming events show as "Pending" in the UI.
// QR check-in is a planned feature, so these records are labelled as demo data.
export const attendanceRecords = [
  { eventId: 18, status: 'Present', method: 'QR check-in (demo)' },
  { eventId: 10, status: 'Present', method: 'Organizer roll call' },
  { eventId: 17, status: 'Present', method: 'Organizer roll call' },
  { eventId: 16, status: 'Present', method: 'Organizer roll call' },
  { eventId: 14, status: 'Present', method: 'QR check-in (demo)' },
  { eventId: 15, status: 'Present', method: 'Organizer roll call' },
];

// Demo certificates. Not real, not generated by a backend.
export const certificates = [
  { id: 'CF-DEMO-2026-001', eventId: 10, type: 'Runner-up', issuedOn: '2026-09-22' },
  { id: 'CF-DEMO-2026-002', eventId: 14, type: 'Participation', issuedOn: '2026-08-28' },
  { id: 'CF-DEMO-2026-003', eventId: 15, type: 'Participation', issuedOn: '2026-08-01' },
  { id: 'CF-DEMO-2026-004', eventId: 16, type: 'Volunteer', issuedOn: '2026-09-03' },
];

// Proposed point rules for the participation system (not active backend rules yet)
export const pointRules = [
  { activity: 'Participation', points: 10 },
  { activity: 'Workshop', points: 15 },
  { activity: 'Hackathon', points: 30 },
  { activity: 'Volunteer', points: 25 },
  { activity: 'Winner', points: 50 },
  { activity: 'Runner-up', points: 30 },
];

// Points earned per event. The total is 120.
export const pointsHistory = [
  { eventId: 18, activity: 'Participation', points: 10, date: '2026-09-26' },
  { eventId: 10, activity: 'Runner-up', points: 30, date: '2026-09-15' },
  { eventId: 17, activity: 'Participation', points: 10, date: '2026-09-05' },
  { eventId: 16, activity: 'Volunteer', points: 25, date: '2026-08-30' },
  { eventId: 14, activity: 'Workshop', points: 15, date: '2026-08-22' },
  { eventId: 15, activity: 'Hackathon', points: 30, date: '2026-07-26' },
];

// Events whose feedback was already submitted in the demo data
export const feedbackSeed = [10, 14];

export const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

// Recent activity feed, newest first
export const studentActivity = [
  { id: 1, type: 'registration', eventId: 1, date: '2026-09-29' },
  { id: 2, type: 'registration', eventId: 2, date: '2026-09-27' },
  { id: 3, type: 'attendance', eventId: 18, date: '2026-09-26' },
  { id: 4, type: 'certificate', eventId: 10, date: '2026-09-22' },
  { id: 5, type: 'points', eventId: 10, date: '2026-09-15', points: 30 },
];

// ---------- Faculty dashboard ----------
export const facultyStats = [
  { label: 'Events', value: '12', note: '3 upcoming', tone: 'primary' },
  { label: 'Registrations', value: '486', note: '+58 this week', tone: 'secondary' },
  { label: 'Attendance', value: '82%', note: 'Above target', tone: 'success' },
  { label: 'Pending', value: '7', note: 'Awaiting approval', tone: 'warning' },
];

export const facultyEvents = [
  { id: 1, title: 'TechFest 2026', date: '2026-10-12', registrations: 124, capacity: 200, approval: 'Approved',
  },
  { id: 2, title: 'AI & Machine Learning Workshop', date: '2026-10-15', registrations: 62, capacity: 80, approval: 'Approved',
  },
  { id: 11, title: 'Web Development Bootcamp', date: '2026-11-14', registrations: 35, capacity: 70, approval: 'Pending',
  },
  { id: 7, title: 'Coding Competition', date: '2026-11-02', registrations: 100, capacity: 100, approval: 'Approved',
  },
  { id: 9, title: 'Robotics Workshop', date: '2026-11-09', registrations: 48, capacity: 60, approval: 'Rejected',
  },
];

export const monthlyRegistrations = { labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'], values: [42, 65, 38, 80, 110, 151] };

// ---------- Admin dashboard ----------
export const adminStats = [
  { label: 'Students', value: '6,420', note: '+120 this month', tone: 'primary' },
  { label: 'Faculty', value: '185', note: '12 departments', tone: 'secondary' },
  { label: 'Events', value: '148', note: '9 this week', tone: 'success' },
  { label: 'Registrations', value: '18,542', note: '+1,204 this month', tone: 'warning' },
];

export const pendingApprovals = [
  { id: 1, title: 'Web Development Bootcamp', organizer: 'Coding Club', date: '2026-11-14',
    schedule: [["10:00 AM", "Inauguration and welcome"], ["11:00 AM", "Project expo opens"], ["1:00 PM", "Lunch break"], ["2:30 PM", "Tech talks"], ["4:30 PM", "Awards and closing"]],
    rules: ["Carry your college ID card.", "Teams can have up to 4 members.", "Projects must be original work.", "Judges' decisions are final."],
    prizes: ["Best project: ₹15,000", "Runner-up: ₹8,000", "Best innovation: ₹5,000"],
  },
  { id: 2, title: 'Inter-Department Football League', organizer: 'Sports Committee', date: '2026-11-20',
    schedule: [["2:00 PM", "Introduction to machine learning"], ["2:45 PM", "Hands-on: training your first model"], ["4:00 PM", "Tea break"], ["4:15 PM", "Evaluating and improving models"], ["5:00 PM", "Questions and wrap-up"]],
    rules: ["Bring a laptop with Python installed.", "Only registered participants can attend."],
  },
  { id: 3, title: 'Battle of Bands', organizer: 'Music Club', date: '2026-12-05',
    schedule: [["9:00 AM", "Team check-in"], ["10:00 AM", "Problem statements announced"], ["10:30 AM", "Hacking begins"], ["Next day, 9:00 AM", "Submissions close"], ["Next day, 11:00 AM", "Demos and results"]],
    rules: ["Teams of 2 to 4 members.", "All code must be written during the event.", "Open-source libraries are allowed.", "Every team must present a working demo."],
    prizes: ["First place: ₹30,000", "Second place: ₹15,000", "Best campus impact idea: ₹10,000"],
  },
];

export const departmentRegistrations = [
  { name: 'Computer Science', value: 5240 },
  { name: 'Information Technology', value: 3980 },
  { name: 'Electronics', value: 2760 },
  { name: 'Business Studies', value: 2910 },
  { name: 'Arts & Design', value: 2150 },
];

export const attendanceOverview = { present: 82, absent: 18 };

export const systemActivity = [
  { id: 1, text: 'Cultural Committee submitted Battle of Bands for approval', time: '15 min ago',
    schedule: [["10:00 AM", "Inauguration and welcome"], ["11:00 AM", "Project expo opens"], ["1:00 PM", "Lunch break"], ["2:30 PM", "Tech talks"], ["4:30 PM", "Awards and closing"]],
    rules: ["Carry your college ID card.", "Teams can have up to 4 members.", "Projects must be original work.", "Judges' decisions are final."],
    prizes: ["Best project: ₹15,000", "Runner-up: ₹8,000", "Best innovation: ₹5,000"],
  },
  { id: 2, text: 'Venue "Open Air Theatre" booked for Cultural Night', time: '1 hour ago',
    schedule: [["2:00 PM", "Introduction to machine learning"], ["2:45 PM", "Hands-on: training your first model"], ["4:00 PM", "Tea break"], ["4:15 PM", "Evaluating and improving models"], ["5:00 PM", "Questions and wrap-up"]],
    rules: ["Bring a laptop with Python installed.", "Only registered participants can attend."],
  },
  { id: 3, text: '120 new student accounts were added', time: '3 hours ago',
    schedule: [["9:00 AM", "Team check-in"], ["10:00 AM", "Problem statements announced"], ["10:30 AM", "Hacking begins"], ["Next day, 9:00 AM", "Submissions close"], ["Next day, 11:00 AM", "Demos and results"]],
    rules: ["Teams of 2 to 4 members.", "All code must be written during the event.", "Open-source libraries are allowed.", "Every team must present a working demo."],
    prizes: ["First place: ₹30,000", "Second place: ₹15,000", "Best campus impact idea: ₹10,000"],
  },
  { id: 4, text: 'Announcement published: Sports Meet timings', time: 'Yesterday',
    schedule: [["8:30 AM", "Team check-in"], ["9:30 AM", "Opening march past"], ["10:30 AM", "Track and field heats"], ["2:00 PM", "Team event finals"], ["4:30 PM", "Medal ceremony"]],
    rules: ["Wear proper sports attire and shoes.", "Report 30 minutes before your event.", "Referee decisions are final."],
    prizes: ["Medals for the top three in each event", "Overall department trophy"],
  },
];

// ---------- Section 2: event discovery helpers ----------
export const STATUS_LIST = ['Open', 'Full', 'Completed'];

// Short department codes so students can search "CSE" or "ECE"
const DEPARTMENT_CODES = {
  'Computer Science': 'CSE',
  'Information Technology': 'IT',
  Electronics: 'ECE',
  'Business Studies': 'BBA',
  'Arts & Design': 'Arts',
  'Physical Education': 'PE',
};

// Status is worked out from the numbers, so it can never disagree with the seat count.
export function getEventStatus(event) {
  if (event.status === 'Completed') return 'Completed';
  return event.registered >= event.capacity ? 'Full' : 'Open';
}

export function getRemainingSeats(event) {
  return Math.max(event.capacity - event.registered, 0);
}

// Case-insensitive search over title, category, organizer, department (and its code) and venue
export function eventMatchesSearch(event, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const text = [event.title, event.category, event.organizer, event.department, DEPARTMENT_CODES[event.department], event.venue]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((word) => text.includes(word));
}

export const SORT_OPTIONS = [
  { value: 'upcoming', label: 'Upcoming first' },
  { value: 'date-asc', label: 'Date: earliest first' },
  { value: 'date-desc', label: 'Date: latest first' },
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' },
];

export function sortEvents(list, sortKey) {
  const sorted = [...list];
  switch (sortKey) {
    case 'date-desc': return sorted.sort((a, b) => b.date.localeCompare(a.date));
    case 'name-asc': return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'name-desc': return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case 'date-asc': return sorted.sort((a, b) => a.date.localeCompare(b.date));
    default: {
      // Upcoming events first (soonest first), then finished events (most recent first)
      const upcoming = sorted.filter((e) => e.status !== 'Completed').sort((a, b) => a.date.localeCompare(b.date));
      const past = sorted.filter((e) => e.status === 'Completed').sort((a, b) => b.date.localeCompare(a.date));
      return upcoming.concat(past);
    }
  }
}

// Same category first, then other upcoming events, never the current one
export function getRelatedEvents(event, limit = 3) {
  const others = events.filter((e) => e.id !== event.id && e.status !== 'Completed');
  const same = others.filter((e) => e.category === event.category);
  const rest = others.filter((e) => e.category !== event.category);
  return sortEvents([...same], 'date-asc').concat(sortEvents(rest, 'date-asc')).slice(0, limit);
}

export function countEventsByOrganizer(organizer) {
  return events.filter((e) => e.organizer === organizer).length;
}

// ---------- Lookups used by the student pages ----------
export const getEventById = (id) => events.find((e) => e.id === Number(id));

export function describeActivity(item) {
  const title = getEventById(item.eventId)?.title ?? 'an event';
  switch (item.type) {
    case 'registration': return `Registered for ${title}`;
    case 'attendance': return `Attended ${title}`;
    case 'certificate': return `Certificate issued for ${title}`;
    case 'points': return `Earned ${item.points} points for ${title}`;
    default: return title;
  }
}

// Whole days from the demo "today" to a date (negative when the date is in the past)
export function daysFromToday(iso) {
  return Math.round((new Date(`${iso}T00:00:00Z`) - new Date(`${DEMO_TODAY}T00:00:00Z`)) / 86400000);
}
