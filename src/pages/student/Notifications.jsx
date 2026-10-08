import { useState } from 'react';
import { BellOff } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import NotificationItem from '../../components/NotificationItem';
import Tabs from '../../components/Tabs';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';
import useNotificationFeed from '../../hooks/useNotificationFeed';

const TABS = ['All', 'Unread'];

export default function Notifications() {
  const { notifications, unreadCount, markRead, markAllRead, clear } = useNotificationFeed();
  const [tab, setTab] = useState('All');
  const [toast, showToast, closeToast] = useToast();

  const list = tab === 'Unread' ? notifications.filter((n) => n.unread) : notifications;
  const ids = notifications.map((n) => n.id);
  const run = async (action, message) => {
    try { await action(); showToast(message); } catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <div className="dash-page">
      <PageHeader
        title="Notifications"
        text="Updates about your events, certificates and feedback."
        crumb="Notifications"
        action={notifications.length > 0 && (
          <div className="head-actions">
            <Button variant="outline" size="sm" disabled={unreadCount === 0} onClick={() => run(() => markAllRead(), 'All notifications marked as read')}>Mark all as read</Button>
            <Button variant="ghost" size="sm" onClick={() => run(() => clear(ids), 'Notifications cleared')}>Clear all</Button>
          </div>
        )}
      />

      <section className="card panel">
        <div className="panel-head">
          <Tabs tabs={TABS} active={tab} onChange={setTab} label="Notification filter" />
          <span className="panel-sub">{unreadCount} unread</span>
        </div>
        {list.length > 0 ? (
          <ul className="notification-list">
            {list.map((n) => (
              <NotificationItem key={n.id} notification={n} onMarkRead={(id) => run(() => markRead([id]), 'Marked as read')} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={BellOff} title={tab === 'Unread' && notifications.length > 0 ? 'No unread notifications' : 'No notifications'} text="You're all caught up." />
        )}
      </section>
      <Toast message={toast} onDone={closeToast} />
    </div>
  );
}
