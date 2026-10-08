import { Link } from 'react-router-dom';
import { Ticket, CalendarClock, Award, MessageSquare, Sparkles, Bell, QrCode, Megaphone, ShieldCheck, Ban, UserCog } from 'lucide-react';
import Button from './Button';

const ICONS = { registration: Ticket, schedule: CalendarClock, certificate: Award, feedback: MessageSquare, event: Sparkles, attendance: QrCode, announcement: Megaphone, approval: ShieldCheck, cancellation: Ban, account: UserCog };

export default function NotificationItem({ notification, onMarkRead }) {
  const Icon = ICONS[notification.type] || Bell;
  const { link } = notification;
  const isEvent = link?.startsWith('/events/');

  return (
    <li className={`notification-item ${notification.unread ? 'is-unread' : ''}`}>
      <span className="notification-icon" aria-hidden="true"><Icon size={20} /></span>
      <div className="notification-body">
        <p className="notification-title">
          {notification.title}
          {notification.unread && <span className="unread-tag">Unread</span>}
        </p>
        <p className="notification-text">{notification.text}</p>
        <p className="notification-time">{notification.time}</p>
      </div>
      <div className="notification-actions">
        {link && <Link to={link} className="text-link" onClick={() => onMarkRead(notification.id)}>{isEvent ? 'View event' : 'Open'}</Link>}
        {notification.unread && <Button variant="ghost" size="sm" onClick={() => onMarkRead(notification.id)}>Mark as read</Button>}
      </div>
    </li>
  );
}
