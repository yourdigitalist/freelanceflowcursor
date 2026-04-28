import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronUp, Paperclip, CheckCircle2 } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Lightbulb } from 'lucide-react';

interface FeatureRequestRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
};

export default function FeatureRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [featureRequests, setFeatureRequests] = useState<FeatureRequestRow[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [featureStatusFilter, setFeatureStatusFilter] = useState<string>('all');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitDescription, setSubmitDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  const fetchFeatureRequests = async () => {
    setFeaturesLoading(true);
    const { data: reqData, error: reqError } = await supabase
      .from('feature_requests')
      .select('id, user_id, title, description, status, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (reqError) {
      setFeatureRequests([]);
      setFeaturesLoading(false);
      return;
    }
    const requests = (reqData as FeatureRequestRow[]) || [];
    setFeatureRequests(requests);
    const ids = requests.map((r) => r.id);
    const { data: voteData } = await supabase
      .from('feature_request_votes')
      .select('feature_request_id, user_id')
      .in('feature_request_id', ids);
    const byRequest: Record<string, number> = {};
    const myVoteSet = new Set<string>();
    (voteData || []).forEach((v: { feature_request_id: string; user_id: string }) => {
      byRequest[v.feature_request_id] = (byRequest[v.feature_request_id] ?? 0) + 1;
      if (user && v.user_id === user.id) myVoteSet.add(v.feature_request_id);
    });
    setVoteCounts(byRequest);
    setMyVotes(myVoteSet);
    setFeaturesLoading(false);
  };

  useEffect(() => {
    if (user) fetchFeatureRequests();
  }, [user?.id]);

  const filteredFeatures = useMemo(() => {
    let list = [...featureRequests];
    if (featureStatusFilter !== 'all') list = list.filter((r) => r.status === featureStatusFilter);
    list.sort((a, b) => {
      const votesA = voteCounts[a.id] ?? 0;
      const votesB = voteCounts[b.id] ?? 0;
      if (votesB !== votesA) return votesB - votesA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [featureRequests, featureStatusFilter, voteCounts]);

  const handleVote = async (featureRequestId: string) => {
    if (!user) return;
    setVotingId(featureRequestId);
    const voted = myVotes.has(featureRequestId);
    try {
      if (voted) {
        const { error } = await supabase
          .from('feature_request_votes')
          .delete()
          .eq('feature_request_id', featureRequestId)
          .eq('user_id', user.id);
        if (error) throw error;
        setMyVotes((prev) => {
          const next = new Set(prev);
          next.delete(featureRequestId);
          return next;
        });
        setVoteCounts((prev) => ({ ...prev, [featureRequestId]: (prev[featureRequestId] ?? 1) - 1 }));
      } else {
        const { error } = await supabase.from('feature_request_votes').insert({
          feature_request_id: featureRequestId,
          user_id: user.id,
        });
        if (error) throw error;
        setMyVotes((prev) => new Set(prev).add(featureRequestId));
        setVoteCounts((prev) => ({ ...prev, [featureRequestId]: (prev[featureRequestId] ?? 0) + 1 }));
      }
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Failed to update vote';
      toast({ title: 'Vote failed', description: msg, variant: 'destructive' });
    }
    setVotingId(null);
  };

  const handleSubmitRequest = async () => {
    if (!user || !submitTitle.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('feature_requests').insert({
        user_id: user.id,
        title: submitTitle.trim(),
        description: submitDescription.trim() || null,
        status: 'open',
      });
      if (error) throw error;
      toast({ title: 'Feature request submitted' });
      setSubmitOpen(false);
      setSubmitTitle('');
      setSubmitDescription('');
      fetchFeatureRequests();
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Failed to submit';
      toast({ title: 'Submit failed', description: msg, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  return (
    <AppLayout>
      <div className="max-w-5xl space-y-4">
        <h1 className="text-2xl font-bold">Feature requests</h1>
        <p className="text-muted-foreground">Vote on features you&apos;d like to see next, or submit your own ideas.</p>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm max-w-[180px]"
            value={featureStatusFilter}
            onChange={(e) => setFeatureStatusFilter(e.target.value)}
          >
            <option value="all">All features</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
          <Button onClick={() => setSubmitOpen(true)} className="gap-2 shrink-0">
            + Submit request
          </Button>
        </div>

        {featuresLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredFeatures.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No feature requests yet. Be the first to suggest an idea.</p>
              <Button className="mt-4" onClick={() => setSubmitOpen(true)}>
                + Submit request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredFeatures.map((req) => {
              const votes = voteCounts[req.id] ?? 0;
              const voted = myVotes.has(req.id);
              return (
                <Card key={req.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn('gap-1 min-w-[72px]', voted && 'bg-primary/10 border-primary text-primary')}
                          onClick={() => handleVote(req.id)}
                          disabled={votingId === req.id || !user}
                        >
                          {votingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronUp className="h-4 w-4" />}
                          {votes}
                        </Button>
                        <span className="text-xs text-muted-foreground mt-1">{voted ? 'Voted' : 'Vote'}</span>
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="font-semibold">{req.title}</h3>
                          <span
                            className={cn(
                              'shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                              STATUS_STYLE[req.status] ?? 'bg-muted text-muted-foreground'
                            )}
                          >
                            {req.status === 'in_progress' && <Paperclip className="h-3 w-3" />}
                            {req.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                            {STATUS_LABELS[req.status] ?? req.status}
                          </span>
                        </div>
                        {req.description && (
                          <p className="text-sm text-muted-foreground mt-1 break-words whitespace-pre-wrap">
                            {req.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit a feature request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="fr-title">Title</Label>
                <Input
                  id="fr-title"
                  value={submitTitle}
                  onChange={(e) => setSubmitTitle(e.target.value)}
                  placeholder="e.g. Re-usable projects"
                />
              </div>
              <div>
                <Label htmlFor="fr-desc">Description</Label>
                <textarea
                  id="fr-desc"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm break-words"
                  value={submitDescription}
                  onChange={(e) => setSubmitDescription(e.target.value)}
                  placeholder="Describe the feature..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSubmitOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitRequest} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
