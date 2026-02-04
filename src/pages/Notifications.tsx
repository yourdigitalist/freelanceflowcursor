import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Bell, Check, CheckCheck, Trash2, Settings, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
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
    if (user) fetchNotifications();
  }, [user]);

  const unreadCount = list.filter((n) => !n.read_at).length;

  const markRead = async (id: string) => {
    setMarkingId(id);
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setList((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setMarkingId(null);
  };

  const markAllRead = async () => {
    const unread = list.filter((n) => !n.read_at).map((n) => n.id);
    if (unread.length === 0) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', unread);
    setList((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
  };

  const deleteOne = async (id: string) => {
    setDeletingId(id);
    await supabase.from('notifications').delete().eq('id', id);
    setList((prev) => prev.filter((n) => n.id !== id));
    setDeletingId(null);
  };

  const deleteAll = async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('user_id', user.id);
    setList([]);
    setDeleteAllOpen(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings/notifications">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
            {list.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Mark all read
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteAllOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete all
                </Button>
              </>
            )}
          </div>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : list.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No notifications yet</p>
                <p className="text-sm mt-1">When you get notifications they’ll show up here.</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/settings/notifications">Notification settings</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {list.map((n) => (
                  <li
                    key={n.id}
                    className={`flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors ${!n.read_at ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      {n.link ? (
                        <Link
                          to={n.link.startsWith('/') ? n.link : `/${n.link}`}
                          className="font-medium text-foreground hover:underline block"
                          onClick={() => !n.read_at && markRead(n.id)}
                        >
                          {n.title}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">{n.title}</span>
                      )}
                      {n.body && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.read_at && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => markRead(n.id)}
                          disabled={markingId === n.id}
                        >
                          {markingId === n.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" title="Mark as read" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteOne(n.id)}
                        disabled={deletingId === n.id}
                      >
                        {deletingId === n.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" title="Delete" />
                        )}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all your notifications. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
