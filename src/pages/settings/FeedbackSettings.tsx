import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type FeedbackRow = Database['public']['Tables']['feedback']['Row'];

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'fixed', label: 'Fixed' },
];

export default function FeedbackSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [list, setList] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .maybeSingle();
    setIsAdmin(data?.is_admin ?? false);
  };

  const fetchFeedback = async () => {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feedback:', error);
      setList([]);
      toast({ title: 'Error loading feedback', variant: 'destructive' });
    } else {
      setList((data as FeedbackRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchFeedback();
    }
  }, [user]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('feedback').update({ status }).eq('id', id);
      if (error) throw error;
      setList((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      toast({ title: 'Status updated' });
    } catch (e) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
    setUpdatingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Feedback
        </CardTitle>
        <CardDescription>
          Feedback submitted by users when something isn&apos;t working. You see your own
          submissions; admins see all feedback and can update status.
          {!isAdmin && (
            <span className="block mt-1 text-muted-foreground">
              Only your feedback is listed below.
            </span>
          )}
        </CardDescription>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feedback list</CardTitle>
          <CardDescription>{list.length} item{list.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          ) : (
            <ul className="space-y-4">
              {list.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-lg border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium whitespace-pre-wrap">{row.message}</p>
                    {row.context && (
                      <p className="text-xs text-muted-foreground mt-1">Context: {row.context}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(row.created_at), 'MMM d, yyyy HH:mm')}
                      {isAdmin && (
                        <span className="ml-2">User: {row.user_id.slice(0, 8)}…</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(isAdmin || row.user_id === user?.id) && (
                      <select
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={row.status}
                        onChange={(e) => updateStatus(row.id, e.target.value)}
                        disabled={updatingId === row.id}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {!isAdmin && row.user_id !== user?.id && (
                      <span className="text-sm text-muted-foreground capitalize">{row.status}</span>
                    )}
                    {updatingId === row.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}