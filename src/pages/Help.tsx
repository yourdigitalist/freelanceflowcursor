import { useEffect, useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import {
  HelpCircle,
  MessageCircle,
  Mail,
  PlayCircle,
  Lightbulb,
  Loader2,
  ChevronUp,
  Paperclip,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface FeatureRequestRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

type HelpCategory = 'faq' | 'contact' | 'onboarding';

interface HelpContentRow {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  category: string;
  sort_order: number;
  updated_at: string;
}

const CATEGORY_LABELS: Record<HelpCategory, string> = {
  faq: 'FAQs',
  contact: 'Contact',
  onboarding: 'Onboarding',
};

const CATEGORY_ICONS: Record<HelpCategory, React.ComponentType<{ className?: string }>> = {
  faq: HelpCircle,
  contact: Mail,
  onboarding: PlayCircle,
};

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

export default function Help() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'features'>('overview');
  const [helpContent, setHelpContent] = useState<HelpContentRow[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);
  const [loading, setLoading] = useState(true);

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

  const [searchParams, setSearchParams] = useSearchParams();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackContext, setFeedbackContext] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get('feedback') === 'open') {
      setFeedbackOpen(true);
      setFeedbackContext(window.location.pathname || '');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleFeedbackSubmit = async () => {
    if (!user || !feedbackMessage.trim()) {
      toast({ title: 'Please enter a message', variant: 'destructive' });
      return;
    }
    setFeedbackSubmitting(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        message: feedbackMessage.trim(),
        context: feedbackContext.trim() || null,
        status: 'new',
      });
      if (error) throw error;
      toast({ title: 'Feedback sent. Thank you!' });
      setFeedbackOpen(false);
      setFeedbackMessage('');
      setFeedbackContext('');
    } catch (e) {
      toast({ title: 'Failed to send feedback', variant: 'destructive' });
    }
    setFeedbackSubmitting(false);
  };

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('help_content')
        .select('id, slug, title, body, category, sort_order, updated_at')
        .in('category', ['faq', 'contact', 'onboarding'])
        .order('sort_order', { ascending: true })
        .order('title');

      if (error) {
        console.error('Error fetching help content:', error);
        setHelpContent([]);
      } else {
        const rows = (data as HelpContentRow[]) || [];
        setHelpContent(rows);
        setSelectedCategory((prev) => {
          if (prev) return prev;
          if (rows.length > 0) return rows[0].category as HelpCategory;
          return 'faq';
        });
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const fetchFeatureRequests = async () => {
    setFeaturesLoading(true);
    const { data: reqData, error: reqError } = await supabase
      .from('feature_requests')
      .select('id, user_id, title, description, status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (reqError) {
      console.error('Error fetching feature requests:', reqError);
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
    if (activeTab === 'features' && user) {
      fetchFeatureRequests();
    }
  }, [activeTab, user?.id]);

  const filteredFeatures = useMemo(() => {
    let list = [...featureRequests];
    if (featureStatusFilter !== 'all') {
      list = list.filter((r) => r.status === featureStatusFilter);
    }
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
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : (e instanceof Error ? e.message : 'Failed to submit');
      toast({ title: 'Submit failed', description: msg, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const byCategory = helpContent.reduce(
    (acc, row) => {
      const c = row.category as HelpCategory;
      if (!acc[c]) acc[c] = [];
      acc[c].push(row);
      return acc;
    },
    {} as Record<HelpCategory, HelpContentRow[]>
  );

  const selectedItems = selectedCategory ? byCategory[selectedCategory] ?? [] : [];
  const selectedItem = selectedItems.length === 1 ? selectedItems[0] : null;
  const multipleInCategory = selectedItems.length > 1;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Help Center</h1>
          <p className="text-muted-foreground mt-1">
            Get support, find answers, and see how to get started.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'features')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Feature requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="flex flex-col md:flex-row gap-6">
              <aside className="md:w-56 shrink-0">
                <Card>
                  <CardContent className="p-2">
                    {(['faq', 'contact', 'onboarding'] as const).map((cat) => {
                      const Icon = CATEGORY_ICONS[cat];
                      const count = byCategory[cat]?.length ?? 0;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                            selectedCategory === cat
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {CATEGORY_LABELS[cat]}
                          {count > 0 && (
                            <span className="ml-auto text-xs text-muted-foreground">{count}</span>
                          )}
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
              </aside>

              <div className="flex-1 min-w-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : selectedCategory && (selectedItems.length > 0 || selectedItem) ? (
                  <Card>
                    <CardContent className="p-6">
                      {multipleInCategory ? (
                        <div className="space-y-6">
                          {selectedItems.map((item) => (
                            <div key={item.id}>
                              <h2 className="text-lg font-semibold mb-2">{item.title}</h2>
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                {item.body ? (
                                  <ReactMarkdown>{item.body}</ReactMarkdown>
                                ) : (
                                  <p className="text-muted-foreground">No content yet.</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : selectedItem ? (
                        <>
                          <h2 className="text-lg font-semibold mb-4">{selectedItem.title}</h2>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            {selectedItem.body ? (
                              <ReactMarkdown>{selectedItem.body}</ReactMarkdown>
                            ) : (
                              <p className="text-muted-foreground">No content yet.</p>
                            )}
                          </div>
                        </>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No content in this section yet.</p>
                      <p className="text-sm mt-1">Add FAQs, contact info, and onboarding docs in Settings → Help content.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <Card className="mt-8 border-primary/20">
              <CardContent className="p-6">
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  Something not working?
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Send us feedback so we can fix it.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setFeedbackContext(window.location.pathname || '');
                    setFeedbackOpen(true);
                  }}
                >
                  Send feedback
                </Button>
              </CardContent>
            </Card>

            <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send feedback</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Something not working? Tell us what happened so we can fix it.
                </p>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="feedback-message">Message</Label>
                    <textarea
                      id="feedback-message"
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Describe the issue..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="feedback-context">Where (optional)</Label>
                    <Input
                      id="feedback-context"
                      value={feedbackContext}
                      onChange={(e) => setFeedbackContext(e.target.value)}
                      placeholder="e.g. Invoices page"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleFeedbackSubmit} disabled={feedbackSubmitting}>
                    {feedbackSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="features" className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <p className="text-muted-foreground">
                Vote on features you&apos;d like to see next, or submit your own ideas.
              </p>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={featureStatusFilter}
                  onChange={(e) => setFeatureStatusFilter(e.target.value)}
                >
                  <option value="all">All features</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
                <Button onClick={() => setSubmitOpen(true)} className="gap-2">
                  + Submit request
                </Button>
              </div>
            </div>
            {featuresLoading ? (
              <div className="flex items-center justify-center py-12">
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
                              className={cn(
                                'gap-1 min-w-[72px]',
                                voted && 'bg-primary/10 border-primary text-primary'
                              )}
                              onClick={() => handleVote(req.id)}
                              disabled={votingId === req.id || !user}
                            >
                              {votingId === req.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ChevronUp className="h-4 w-4" />
                              )}
                              {votes}
                            </Button>
                            <span className="text-xs text-muted-foreground mt-1">
                              {voted ? 'Voted' : 'Vote'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
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
                              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
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
                      className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={submitDescription}
                      onChange={(e) => setSubmitDescription(e.target.value)}
                      placeholder="Describe the feature..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSubmitOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitRequest} disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
