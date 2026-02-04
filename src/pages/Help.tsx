import { useEffect, useState, useMemo } from 'react';
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
import ReactMarkdown from 'react-markdown';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import DOMPurify from 'dompurify';

interface FeatureRequestRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface HelpContentRow {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  category: string;
  sort_order: number;
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

type HelpSection = 'faqs' | 'onboarding' | 'features' | 'feedback' | 'contact';

const SIDEBAR_ITEMS: { key: HelpSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'faqs', label: 'FAQs', icon: HelpCircle },
  { key: 'onboarding', label: 'Onboarding', icon: PlayCircle },
  { key: 'features', label: 'Feature requests', icon: Lightbulb },
  { key: 'feedback', label: 'Feedback', icon: MessageCircle },
  { key: 'contact', label: 'Contact', icon: Mail },
];

const CONTACT_EMAIL = 'marina@yourdigitalist.com';

function isHtml(s: string | null): boolean {
  if (!s || !s.trim()) return false;
  const t = s.trim();
  return t.startsWith('<') && t.endsWith('>');
}

function SafeContent({ content, className }: { content: string | null; className?: string }) {
  if (!content?.trim()) return <p className="text-muted-foreground">No content yet.</p>;
  if (isHtml(content)) {
    const sanitized = DOMPurify.sanitize(content, { ADD_ATTR: ['target'] });
    return (
      <div
        className={cn('prose prose-sm dark:prose-invert max-w-full break-words', className)}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-full break-words', className)}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

export default function Help() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionParam = searchParams.get('section') as HelpSection | null;
  const [section, setSection] = useState<HelpSection>(sectionParam && SIDEBAR_ITEMS.some((i) => i.key === sectionParam) ? sectionParam : 'faqs');

  const [helpContent, setHelpContent] = useState<HelpContentRow[]>([]);
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

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackContext, setFeedbackContext] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  useEffect(() => {
    if (searchParams.get('feedback') === 'open') {
      setSection('feedback');
      setFeedbackOpen(true);
      setFeedbackContext(window.location.pathname || '');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const s = searchParams.get('section') as HelpSection | null;
    if (s && SIDEBAR_ITEMS.some((i) => i.key === s)) setSection(s);
  }, [searchParams]);

  const setSectionAndUrl = (s: HelpSection) => {
    setSection(s);
    setSearchParams({ section: s }, { replace: true });
  };

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
        setHelpContent((data as HelpContentRow[]) || []);
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
    if (section === 'features' && user) fetchFeatureRequests();
  }, [section, user?.id]);

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
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : (e instanceof Error ? e.message : 'Failed to submit');
      toast({ title: 'Submit failed', description: msg, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Help Center contact from ${contactName || 'Someone'}`);
    const body = encodeURIComponent(
      `${contactMessage}\n\n---\nFrom: ${contactName || 'N/A'}\nEmail: ${contactEmail || 'N/A'}`
    );
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    toast({ title: 'Opening your email client...', description: `Message will be sent to ${CONTACT_EMAIL}` });
  };

  const faqItems = helpContent.filter((r) => r.category === 'faq');
  const onboardingItems = helpContent.filter((r) => r.category === 'onboarding');

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row gap-8 max-w-5xl">
        <aside className="lg:w-64 shrink-0 min-w-0">
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Help Center</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Get support and get started</p>
            </div>
            <nav className="space-y-0.5 pt-2 border-t">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = section === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSectionAndUrl(item.key)}
                    className={cn(
                      'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left whitespace-nowrap',
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {section === 'faqs' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">FAQs</h1>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : faqItems.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No FAQs yet. Admins can add them in Settings → Help content.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Accordion type="single" collapsible className="w-full">
                      {faqItems.map((item) => (
                        <AccordionItem key={item.id} value={item.id}>
                          <AccordionTrigger className="px-6 text-left">{item.title}</AccordionTrigger>
                          <AccordionContent className="px-6 pb-4 pt-0">
                            <div className="break-words max-w-full">
                              <SafeContent content={item.body} />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {section === 'onboarding' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">Onboarding</h1>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : onboardingItems.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <PlayCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No onboarding content yet. Admins can add it in Settings → Help content.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 space-y-6">
                    {onboardingItems.map((item) => (
                      <div key={item.id}>
                        <h2 className="text-lg font-semibold mb-2">{item.title}</h2>
                        <div className="break-words max-w-full">
                          <SafeContent content={item.body} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {section === 'features' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">Feature requests</h1>
              <p className="text-muted-foreground">
                Vote on features you&apos;d like to see next, or submit your own ideas.
              </p>
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
          )}

          {section === 'feedback' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">Feedback</h1>
              <p className="text-muted-foreground">Something not working? Send us feedback so we can fix it.</p>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="feedback-message">Message</Label>
                      <textarea
                        id="feedback-message"
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        placeholder="Describe the issue..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="feedback-context">Where (optional)</Label>
                      <Input
                        id="feedback-context"
                        className="mt-1"
                        value={feedbackContext}
                        onChange={(e) => setFeedbackContext(e.target.value)}
                        placeholder="e.g. Invoices page"
                      />
                    </div>
                    <Button onClick={handleFeedbackSubmit} disabled={feedbackSubmitting || !user}>
                      {feedbackSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send feedback
                    </Button>
                    {!user && <p className="text-sm text-muted-foreground">Sign in to send feedback.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {section === 'contact' && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold">Contact</h1>
              <p className="text-muted-foreground">Get in touch with us at {CONTACT_EMAIL}</p>
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="contact-name">Name</Label>
                      <Input
                        id="contact-name"
                        className="mt-1"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-email">Email</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        className="mt-1"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-message">Message</Label>
                      <textarea
                        id="contact-message"
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Your message..."
                        required
                      />
                    </div>
                    <Button type="submit">Open email to send</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
