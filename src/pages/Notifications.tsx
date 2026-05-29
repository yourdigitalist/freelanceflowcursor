import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Bell, Check, Loader2, Trash2 } from '@/components/icons';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { getNotificationVisual, renderNotificationMessage } from '@/lib/notificationDisplay';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

function notificationMessage(n: NotificationRow) {
  if (n.body && n.body.trim() !== n.title.trim()) {
    return `${n.title} ${n.body}`;
  }
  return n.title;
}

export default function Notifications() {
  const { user } = useAuth();
  const [list, setList] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, link, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching notifications:', error);
      setList([]);
    } else {
      setList((data as NotificationRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const channel = supabase
      .channel(`notifications-list-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          fetchNotifications();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = list.filter((n) => !n.read_at).length;

  const markRead = async (id: string) => {
    setMarkingId(id);
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setList((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setMarkingId(null);
  };

  const deleteOne = async (id: string) => {
    setDeletingId(id);
    await supabase.from('notifications').delete().eq('id', id);
    setList((prev) => prev.filter((n) => n.id !== id));
    setDeletingId(null);
  };

  const markAllRead = async () => {
    const unread = list.filter((n) => !n.read_at).map((n) => n.id);
    if (unread.length === 0) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', unread);
    setList((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
  };

  const deleteAll = async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setList([]);
    setDeleteAllOpen(false);
  };

  const handleRowActivate = (n: NotificationRow) => {
    if (!n.read_at) {
      void markRead(n.id);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-5">
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <div className="flex items-center gap-3 shrink-0">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Mark all read
                </button>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-12 px-4 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium text-foreground">No notifications yet</p>
              <p className="text-sm mt-1">When you get notifications they’ll show up here.</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to="/settings/notifications">Notification settings</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {list.map((n) => {
                const isUnread = !n.read_at;
                const { Icon, iconWrap, iconClass } = getNotificationVisual(
                  n.type,
                  n.title,
                  n.body,
                  !isUnread,
                );
                const message = notificationMessage(n);
                const href = n.link ? (n.link.startsWith('/') ? n.link : `/${n.link}`) : null;

                const rowMainClass =
                  'flex min-w-0 flex-1 items-start gap-3 text-left transition-colors';

                const rowBody = (
                  <>
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        iconWrap,
                      )}
                    >
                      <Icon className={cn('h-4 w-4', iconClass)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground leading-snug">
                        {renderNotificationMessage(message)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </>
                );

                const rowActions = (
                  <div
                    className={cn(
                      'flex shrink-0 items-center gap-0.5',
                      'opacity-100 sm:opacity-0 sm:transition-opacity',
                      'sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
                    )}
                  >
                    {isUnread ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        title="Mark as read"
                        disabled={markingId === n.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void markRead(n.id);
                        }}
                      >
                        {markingId === n.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Delete"
                      disabled={deletingId === n.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void deleteOne(n.id);
                      }}
                    >
                      {deletingId === n.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );

                return (
                  <li
                    key={n.id}
                    className={cn(
                      'group relative transition-colors hover:bg-muted/40 focus-within:bg-muted/40',
                      isUnread ? 'bg-primary/5' : 'bg-card',
                    )}
                  >
                    {isUnread ? (
                      <span
                        className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary"
                        aria-hidden
                      />
                    ) : null}
                    <div className="flex items-start gap-1 px-4 py-3.5 pl-5 sm:px-5 sm:pl-6">
                      {href ? (
                        <Link
                          to={href}
                          onClick={() => handleRowActivate(n)}
                          className={rowMainClass}
                        >
                          {rowBody}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRowActivate(n)}
                          className={rowMainClass}
                        >
                          {rowBody}
                        </button>
                      )}
                      {rowActions}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {list.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <Link
              to="/settings/notifications"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Notification settings
            </Link>
            <button
              type="button"
              onClick={() => setDeleteAllOpen(true)}
              className="text-muted-foreground transition-colors hover:text-destructive"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all your notifications. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void deleteAll()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
