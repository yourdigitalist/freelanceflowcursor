import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, RotateCcw } from '@/components/icons';
import { cn } from '@/lib/utils';

type EmailCategory = 'auth' | 'lance_to_user' | 'user_to_client' | 'internal';

type EmailPreviewTemplate = {
  id: string;
  name: string;
  category: EmailCategory;
  from: string;
  to: string;
  trigger: string;
  subject: string;
  html: string;
  note?: string;
};

type PreviewResponse = {
  templates: EmailPreviewTemplate[];
  profile: { name: string; email: string; business_name: string | null };
  auth_templates_available: boolean;
  auth_templates_error: string | null;
  counts: {
    auth: number;
    lance_to_user: number;
    user_to_client: number;
    internal: number;
    total: number;
  };
  error?: string;
};

const CATEGORY_META: Record<
  EmailCategory,
  { label: string; description: string }
> = {
  auth: {
    label: 'Supabase Auth',
    description: 'Sign-up, magic link, and password reset (live templates from Supabase)',
  },
  lance_to_user: {
    label: 'Lance → User',
    description: 'Automated emails from Get Lance to your users',
  },
  user_to_client: {
    label: 'User → Client',
    description: 'Branded emails your users send to their clients (preview uses your profile)',
  },
  internal: {
    label: 'Internal',
    description: 'Emails to the Lance support inbox',
  },
};

const CATEGORY_ORDER: EmailCategory[] = ['auth', 'lance_to_user', 'user_to_client', 'internal'];

export default function AdminComms() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [data, setData] = useState<PreviewResponse | null>(null);

  const loadPreviews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('preview-email-templates', {
        body: {},
      });
      if (error) throw error;
      const payload = result as PreviewResponse | null;
      if (payload?.error) throw new Error(payload.error);
      if (!payload?.templates?.length) {
        throw new Error('No email templates returned');
      }
      setData(payload);
      setSelectedId((prev) => {
        if (prev && payload.templates.some((t) => t.id === prev)) return prev;
        return payload.templates[0]?.id ?? null;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load email previews';
      toast({ title: 'Could not load emails', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadPreviews();
  }, [loadPreviews]);

  const filteredTemplates = useMemo(() => {
    if (!data?.templates) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.templates;
    return data.templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.trigger.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q),
    );
  }, [data?.templates, search]);

  const grouped = useMemo(() => {
    const map = new Map<EmailCategory, EmailPreviewTemplate[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const t of filteredTemplates) {
      const list = map.get(t.category);
      if (list) list.push(t);
    }
    return map;
  }, [filteredTemplates]);

  const selected = useMemo(
    () => data?.templates.find((t) => t.id === selectedId) ?? null,
    [data?.templates, selectedId],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email catalog</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Preview every email Lance sends — auth, user notifications, and client-facing comms.
            User → client previews use your logged-in admin profile for branding and merge fields.
          </p>
          {data?.profile && (
            <p className="text-sm text-muted-foreground mt-2">
              Previewing as <span className="font-medium text-foreground">{data.profile.business_name || data.profile.name}</span>
              {' · '}
              {data.profile.email}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadPreviews(true)} disabled={refreshing}>
          {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {data && (
        <div className="flex flex-wrap gap-2">
          {CATEGORY_ORDER.map((cat) => (
            <Badge key={cat} variant="secondary">
              {CATEGORY_META[cat].label}: {data.counts[cat]}
            </Badge>
          ))}
          <Badge variant="outline">{data.counts.total} total</Badge>
        </div>
      )}

      {!data?.auth_templates_available && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Auth templates not loaded</CardTitle>
            <CardDescription>
              {data?.auth_templates_error ||
                'Set LANCE_MANAGEMENT_ACCESS_TOKEN on the preview-email-templates edge function to fetch live Supabase Auth email HTML.'}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="border-0 shadow-sm lg:max-h-[calc(100vh-12rem)] lg:flex lg:flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              All emails
            </CardTitle>
            <Input
              placeholder="Search emails…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-2"
            />
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 pt-0">
            <ScrollArea className="h-[min(60vh,640px)] px-4 pb-4">
              <div className="space-y-5">
                {CATEGORY_ORDER.map((cat) => {
                  const items = grouped.get(cat) || [];
                  if (items.length === 0) return null;
                  return (
                    <div key={cat}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        {CATEGORY_META[cat].label}
                      </p>
                      <ul className="space-y-1">
                        {items.map((t) => (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedId(t.id)}
                              className={cn(
                                'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                                selectedId === t.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted',
                              )}
                            >
                              <span className="font-medium line-clamp-2">{t.name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          {selected ? (
            <>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>{selected.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {CATEGORY_META[selected.category].description}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{CATEGORY_META[selected.category].label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Subject</dt>
                    <dd className="font-medium mt-0.5">{selected.subject}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Trigger</dt>
                    <dd className="mt-0.5">{selected.trigger}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">From</dt>
                    <dd className="mt-0.5 break-all">{selected.from}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">To</dt>
                    <dd className="mt-0.5 break-all">{selected.to}</dd>
                  </div>
                </dl>
                {selected.note && (
                  <p className="text-sm text-muted-foreground rounded-md bg-muted px-3 py-2">{selected.note}</p>
                )}
                <div className="rounded-lg border overflow-hidden bg-white">
                  <iframe
                    title={`Preview: ${selected.name}`}
                    srcDoc={selected.html}
                    className="w-full min-h-[520px] border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12 text-center text-muted-foreground">
              Select an email from the list to preview it.
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
