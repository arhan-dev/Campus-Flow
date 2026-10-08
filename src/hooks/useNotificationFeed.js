import { useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCampusContext, useStudentContext } from '../context/DataContext';
import { markNotificationsRead, deleteNotifications } from '../services/profileService';

// The signed-in user's real notifications (from the notifications table) and the actions on them.
export default function useNotificationFeed() {
  const { role } = useAuth();
  const student = useStudentContext();
  const campus = useCampusContext();
  const ctx = role === 'student' ? student : campus;
  const notifications = useMemo(() => ctx.data?.notifications || [], [ctx.data]);
  const refresh = ctx.refresh;

  const markRead = useCallback(async (ids) => { await markNotificationsRead(ids); await refresh(); }, [refresh]);
  const clear = useCallback(async (ids) => { await deleteNotifications(ids); await refresh(); }, [refresh]);

  return useMemo(() => ({
    notifications,
    unreadCount: notifications.filter((n) => n.unread).length,
    markRead,
    markAllRead: (ids) => markRead(ids ?? notifications.filter((n) => n.unread).map((n) => n.id)),
    clear,
  }), [notifications, markRead, clear]);
}
