import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ChevronDown, ChevronUp, X } from '@/components/icons';
import {
  GUIDE_REFRESH_EVENT,
  type GuideItemId,
  loadJson,
  profileHasInvoiceCustomization,
  saveJson,
  storageKey,
} from '@/components/layout/startGuideUtils';

type ManualState = Partial<Record<GuideItemId, boolean>>;
type AutoState = Record<GuideItemId, boolean>;

export function StartGuide() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [auto, setAuto] = useState<AutoState>({
    companyProfile: false,
    uploadLogo: false,
    customizeInvoices: false,
    firstClient: false,
    firstProject: false,
  });
  const [manual, setManual] = useState<ManualState>({});
  const [minimized, setMinimized] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const loadGuideState = useCallback(() => {
    if (!user?.id) return;
    const rawManual = loadJson<ManualState & { firstInvoice?: boolean }>(storageKey('manual', user.id), {});
    const manualState: ManualState = { ...rawManual };
    if (rawManual.firstInvoice && !manualState.firstClient) {
      manualState.firstClient = true;
    }
    delete (manualState as { firstInvoice?: boolean }).firstInvoice;
    const isMinimized = loadJson<boolean>(storageKey('minimized', user.id), false);
    const isDismissed = loadJson<boolean>(storageKey('dismissed', user.id), false);
    setManual(manualState);
    setMinimized(isMinimized);
    setDismissed(isDismissed);
  }, [user?.id]);

  const refreshAutoState = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [{ data: profile }, { count: projectCount }, { count: clientCount }, { count: taxCount }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select(
              'business_name, business_logo, business_email, business_phone, business_address, business_website, hourly_rate, invoice_prefix, invoice_include_year, invoice_number_start, invoice_number_padding, invoice_number_reset_yearly, invoice_footer, invoice_notes_default, invoice_bank_details_default, invoice_email_subject_default, invoice_email_message_default, reminder_enabled, reminder_subject_default, reminder_body_default, reminder_days_before',
            )
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('clients')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase.from('taxes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);

      const hasBusinessName = !!(profile?.business_name || '').trim();
      const hasBusinessDetail = !!(
        (profile?.business_email || '').trim() ||
        (profile?.business_phone || '').trim() ||
        (profile?.business_address || '').trim() ||
        (profile?.business_website || '').trim()
      );
      const hasCompanyProfile = hasBusinessName && hasBusinessDetail;
      const hasLogo = !!(profile?.business_logo || '').trim();
      const hasInvoiceCustomization = profileHasInvoiceCustomization(profile, taxCount || 0);

      setAuto({
        companyProfile: hasCompanyProfile,
        uploadLogo: hasLogo,
        customizeInvoices: hasInvoiceCustomization,
        firstClient: (clientCount || 0) > 0,
        firstProject: (projectCount || 0) > 0,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadGuideState();
    refreshAutoState();
  }, [user?.id, loadGuideState, refreshAutoState]);

  useEffect(() => {
    const handler = () => {
      loadGuideState();
      void refreshAutoState();
    };
    window.addEventListener(GUIDE_REFRESH_EVENT, handler);
    return () => window.removeEventListener(GUIDE_REFRESH_EVENT, handler);
  }, [loadGuideState, refreshAutoState]);

  const items = useMemo(
    () => [
      { id: 'companyProfile' as const, label: 'Complete your company profile', link: '/settings/business' },
      { id: 'uploadLogo' as const, label: 'Upload your logo', link: '/settings/business' },
      { id: 'customizeInvoices' as const, label: 'Customize your invoices', link: '/settings/invoices' },
      { id: 'firstClient' as const, label: 'Create your first client', link: '/clients' },
      { id: 'firstProject' as const, label: 'Create your first project', link: '/projects' },
    ],
    []
  );

  const checkedMap = useMemo(() => {
    const map: Record<GuideItemId, boolean> = {
      companyProfile: false,
      uploadLogo: false,
      customizeInvoices: false,
      firstClient: false,
      firstProject: false,
    };
    for (const item of items) {
      map[item.id] = !!auto[item.id] || !!manual[item.id];
    }
    return map;
  }, [items, auto, manual]);

  const completed = items.filter((i) => checkedMap[i.id]).length;
  const percent = Math.round((completed / items.length) * 100);

  const toggleManual = (id: GuideItemId, value: boolean) => {
    if (!user?.id) return;
    const next = { ...manual, [id]: value };
    setManual(next);
    saveJson(storageKey('manual', user.id), next);
  };

  const setGuideMinimized = (value: boolean) => {
    if (!user?.id) return;
    setMinimized(value);
    saveJson(storageKey('minimized', user.id), value);
  };

  const dismissGuide = () => {
    if (!user?.id) return;
    setDismissed(true);
    saveJson(storageKey('dismissed', user.id), true);
  };

  if (!user || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] w-[320px] max-w-[calc(100vw-2rem)]">
      <Card className="shadow-xl border border-border/70">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold">Getting started</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setGuideMinimized(!minimized)}>
                {minimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={dismissGuide} title="Hide guide">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{completed}/{items.length} completed</span>
              <Badge variant="secondary" className="h-5 px-2 text-[11px]">
                {percent}%
              </Badge>
            </div>
            <Progress value={percent} className="h-1.5" />
          </div>
        </CardHeader>
        {!minimized && (
          <CardContent className="pt-0 pb-3">
            <div className="space-y-2">
              {items.map((item) => {
                const checked = checkedMap[item.id];
                return (
                  <div key={item.id} className="flex items-start gap-2 rounded-md px-1 py-1">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggleManual(item.id, !!v)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className={`text-sm leading-5 ${checked ? 'line-through text-muted-foreground' : ''}`}>
                        {item.label}
                      </div>
                      <Link to={item.link} className="text-xs text-primary hover:underline">
                        Open
                      </Link>
                    </div>
                    {checked && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              You can manually check items and hide this card anytime.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
