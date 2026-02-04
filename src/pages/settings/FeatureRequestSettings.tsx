import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lightbulb } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type FeatureRequestRow = Database['public']['Tables']['feature_requests']['Row'];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

export default function FeatureRequestSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [list, setList] = useState<FeatureRequestRow[]>([]);
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

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('feature_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching feature requests:', error);
      setList([]);
      toast({ title: 'Error loading feature requests', variant: 'destructive' });
    } else {
      setList((data as FeatureRequestRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchRequests();
    }
  }, [user]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('feature_requests')
        .update({ status })
        .eq('id', id);
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
          <Lightbulb className="h-5 w-5" />
          Feature requests
        </CardTitle>
        <CardDescription>
          Manage status of feature requests submitted in the Help Center. Users vote and submit
          requests on the Help → Feature requests tab.
          {!isAdmin && (
            <span className="block mt-1 text-amber-600 dark:text-amber-500">
              Only admins can change status. You can view the list below.
            </span>
          )}
        </CardDescription>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All requests</CardTitle>
          <CardDescription>{list.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feature requests yet.</p>
          ) : (
            <ul className="space-y-4">
              {list.map((req) => (
                <li
                  key={req.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{req.title}</p>
                    {req.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {req.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(req.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={req.status}
                        onChange={(e) => updateStatus(req.id, e.target.value)}
                        disabled={updatingId === req.id}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {updatingId === req.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  )}
                  {!isAdmin && (
                    <span className="text-sm text-muted-foreground capitalize shrink-0">
                      {req.status.replace('_', ' ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
