import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import useClickOutside from '../hooks/useClickOutside';
import useNotificationFeed from '../hooks/useNotificationFeed';

// Real notifications from the notifications table, shared with the Notifications page so read state always matches.
export default function NotificationDropdown({ viewAllPath }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const { notifications, unreadCount, markAllRead: markAll, markRead: markOne } = useNotificationFeed();
  // A failed update must not be silent or become an unhandled promise rejection.
  const guarded = (fn) => async (...args) => {
    try { setFailed(false); await fn(...args); } catch { setFailed(true); }
  };
  const markAllRead = guarded(markAll);
  const markRead = guarded(markOne);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div className="dropdown" ref={ref}>
      <button
        type="button"
        className="icon-btn notif-btn"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="dropdown-panel notif-panel">
          <div className="dropdown-header">
            <h2>Notifications</h2>
            <button
              type="button"
              className="link-btn"
              onClick={() => markAllRead()}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
          </div>
          {failed && <p className="notif-empty" role="alert">Could not update your notifications. Please try again.</p>}
          {notifications.length === 0 ? (
            <p className="notif-empty">No notifications</p>
          ) : (
            <ul className="notif-list">
              {notifications.slice(0, 4).map((n) => (
                <li key={n.id} className={n.unread ? 'is-unread' : ''}>
                  <span className="notif-dot" aria-hidden="true" />
                  <div>
                    {n.link ? (
                      <Link to={n.link} className="notif-title" onClick={() => { setOpen(false); if (n.unread) markRead([n.id]); }}>{n.title}</Link>
                    ) : (
                      <p className="notif-title">{n.title}</p>
                    )}
                    <p className="notif-text">{n.text}</p>
                    <p className="notif-time">{n.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {viewAllPath && (
            <Link to={viewAllPath} className="notif-footer" onClick={() => setOpen(false)}>View all notifications</Link>
          )}
        </div>
      )}
    </div>
  );
}
