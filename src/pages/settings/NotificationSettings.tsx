import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  getDefaultPreferences,
  mergeWithDefaults,
  type NotificationPreferences,
  type ChannelPref,
} from '@/lib/notification-preferences';
import type { Json } from '@/integrations/supabase/types';

function ChannelRow({
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <Label className="text-sm font-normal cursor-pointer flex-1">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

function CategorySection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-1">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mb-3">{description}</p>}
      <div className="space-y-0 pl-2 border-l border-muted">{children}</div>
    </div>
  );
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => getDefaultPreferences());

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('user_id', user.id)
      .maybeSingle();
    const raw = (data?.notification_preferences as NotificationPreferences | null) ?? null;
    setPrefs(mergeWithDefaults(raw));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const updateAndSave = useCallback(
    async (updater: (prev: NotificationPreferences) => NotificationPreferences) => {
      if (!user) return;
      const next = updater(prefs);
      setPrefs(next);
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: next as unknown as Json })
        .eq('user_id', user.id);
      setSaving(false);
      if (error) {
        toast({ title: 'Failed to save preferences', variant: 'destructive' });
        load();
      } else {
        toast({ title: 'Preferences saved' });
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!supabaseUrl || !session?.access_token || !user?.id) return;
          fetch(`${supabaseUrl}/functions/v1/sync-users-to-resend`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: user.id }),
          }).catch(() => {});
        });
      }
    },
    [user, prefs, toast, load]
  );

  const setChannel = useCallback(
    (
      category: keyof NotificationPreferences,
      subKey: string,
      channel: keyof ChannelPref,
      value: boolean
    ) => {
      updateAndSave((prev) => {
        const cat = prev[category] as Record<string, ChannelPref | undefined> | undefined;
        if (!cat) return prev;
        const sub = cat[subKey];
        const nextCat = { ...cat, [subKey]: { ...sub, [channel]: value } };
        return { ...prev, [category]: nextCat };
      });
    },
    [updateAndSave]
  );

  const getChannel = useCallback(
    (category: keyof NotificationPreferences, subKey: string, channel: keyof ChannelPref): boolean => {
      const cat = prefs[category] as Record<string, ChannelPref | undefined> | undefined;
      const sub = cat?.[subKey];
      return sub?.[channel] ?? true;
    },
    [prefs]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notification settings</h1>
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notification settings</h1>
        <p className="text-muted-foreground">Manage how and when you receive in-app and email notifications.</p>
      </div>
      {saving && <p className="text-sm text-muted-foreground">Saving…</p>}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Configure in-app and email notifications per category. Email is sent for invoices, approvals, proposals, and contracts where enabled below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <CategorySection title="Invoices">
            <ChannelRow
              label="Due soon – In-app"
              checked={getChannel('invoices', 'dueSoon', 'inApp')}
              onCheckedChange={(v) => setChannel('invoices', 'dueSoon', 'inApp', v)}
            />
            <ChannelRow
              label="Due soon – Email"
              checked={getChannel('invoices', 'dueSoon', 'email')}
              onCheckedChange={(v) => setChannel('invoices', 'dueSoon', 'email', v)}
            />
            <ChannelRow
              label="Overdue – In-app"
              checked={getChannel('invoices', 'overdue', 'inApp')}
              onCheckedChange={(v) => setChannel('invoices', 'overdue', 'inApp', v)}
            />
            <ChannelRow
              label="Overdue – Email"
              checked={getChannel('invoices', 'overdue', 'email')}
              onCheckedChange={(v) => setChannel('invoices', 'overdue', 'email', v)}
            />
          </CategorySection>

          <CategorySection title="Approvals" description="Client feedback and approval requests (formerly Reviews).">
            <ChannelRow
              label="New comment – In-app"
              checked={getChannel('reviews', 'comment', 'inApp')}
              onCheckedChange={(v) => setChannel('reviews', 'comment', 'inApp', v)}
            />
            <ChannelRow
              label="New comment – Email"
              checked={getChannel('reviews', 'comment', 'email')}
              onCheckedChange={(v) => setChannel('reviews', 'comment', 'email', v)}
            />
            <ChannelRow
              label="Approved/Rejected – In-app"
              checked={getChannel('reviews', 'status', 'inApp')}
              onCheckedChange={(v) => setChannel('reviews', 'status', 'inApp', v)}
            />
            <ChannelRow
              label="Approved/Rejected – Email"
              checked={getChannel('reviews', 'status', 'email')}
              onCheckedChange={(v) => setChannel('reviews', 'status', 'email', v)}
            />
            <ChannelRow
              label="Due soon – In-app"
              checked={getChannel('reviews', 'dueSoon', 'inApp')}
              onCheckedChange={(v) => setChannel('reviews', 'dueSoon', 'inApp', v)}
            />
            <ChannelRow
              label="Due soon – Email"
              checked={getChannel('reviews', 'dueSoon', 'email')}
              onCheckedChange={(v) => setChannel('reviews', 'dueSoon', 'email', v)}
            />
            <ChannelRow
              label="Overdue – In-app"
              checked={getChannel('reviews', 'overdue', 'inApp')}
              onCheckedChange={(v) => setChannel('reviews', 'overdue', 'inApp', v)}
            />
            <ChannelRow
              label="Overdue – Email"
              checked={getChannel('reviews', 'overdue', 'email')}
              onCheckedChange={(v) => setChannel('reviews', 'overdue', 'email', v)}
            />
          </CategorySection>

          <CategorySection title="Proposals">
            <ChannelRow
              label="Viewed by client – In-app"
              checked={getChannel('proposals', 'viewed', 'inApp')}
              onCheckedChange={(v) => setChannel('proposals', 'viewed', 'inApp', v)}
            />
            <ChannelRow
              label="Viewed by client – Email"
              checked={getChannel('proposals', 'viewed', 'email')}
              onCheckedChange={(v) => setChannel('proposals', 'viewed', 'email', v)}
            />
            <ChannelRow
              label="Accepted by client – In-app"
              checked={getChannel('proposals', 'accepted', 'inApp')}
              onCheckedChange={(v) => setChannel('proposals', 'accepted', 'inApp', v)}
            />
            <ChannelRow
              label="Accepted by client – Email"
              checked={getChannel('proposals', 'accepted', 'email')}
              onCheckedChange={(v) => setChannel('proposals', 'accepted', 'email', v)}
            />
          </CategorySection>

          <CategorySection title="Contracts">
            <ChannelRow
              label="You signed – In-app"
              checked={getChannel('contracts', 'freelancerSigned', 'inApp')}
              onCheckedChange={(v) => setChannel('contracts', 'freelancerSigned', 'inApp', v)}
            />
            <ChannelRow
              label="Client signed – In-app"
              checked={getChannel('contracts', 'clientSigned', 'inApp')}
              onCheckedChange={(v) => setChannel('contracts', 'clientSigned', 'inApp', v)}
            />
            <ChannelRow
              label="Client signed – Email"
              checked={getChannel('contracts', 'clientSigned', 'email')}
              onCheckedChange={(v) => setChannel('contracts', 'clientSigned', 'email', v)}
            />
            <ChannelRow
              label="Fully signed (both parties) – In-app"
              checked={getChannel('contracts', 'fullySigned', 'inApp')}
              onCheckedChange={(v) => setChannel('contracts', 'fullySigned', 'inApp', v)}
            />
            <ChannelRow
              label="Fully signed (both parties) – Email"
              checked={getChannel('contracts', 'fullySigned', 'email')}
              onCheckedChange={(v) => setChannel('contracts', 'fullySigned', 'email', v)}
            />
            <ChannelRow
              label="Cancelled – In-app"
              checked={getChannel('contracts', 'cancelled', 'inApp')}
              onCheckedChange={(v) => setChannel('contracts', 'cancelled', 'inApp', v)}
            />
            <ChannelRow
              label="Cancelled – Email"
              checked={getChannel('contracts', 'cancelled', 'email')}
              onCheckedChange={(v) => setChannel('contracts', 'cancelled', 'email', v)}
            />
            <ChannelRow
              label="Due soon – In-app"
              checked={getChannel('contracts', 'dueSoon', 'inApp')}
              onCheckedChange={(v) => setChannel('contracts', 'dueSoon', 'inApp', v)}
            />
            <ChannelRow
              label="Due soon – Email"
              checked={getChannel('contracts', 'dueSoon', 'email')}
              onCheckedChange={(v) => setChannel('contracts', 'dueSoon', 'email', v)}
            />
            <ChannelRow
              label="Overdue – In-app"
              checked={getChannel('contracts', 'overdue', 'inApp')}
              onCheckedChange={(v) => setChannel('contracts', 'overdue', 'inApp', v)}
            />
            <ChannelRow
              label="Overdue – Email"
              checked={getChannel('contracts', 'overdue', 'email')}
              onCheckedChange={(v) => setChannel('contracts', 'overdue', 'email', v)}
            />
          </CategorySection>

          <CategorySection title="Marketing">
            <ChannelRow
              label="Product updates and tips – Email"
              checked={prefs.marketing?.email ?? true}
              onCheckedChange={(v) =>
                updateAndSave((prev) => ({
                  ...prev,
                  marketing: { ...prev.marketing, email: v },
                }))
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              You can also unsubscribe via the link in any marketing email. See our Terms for details.
            </p>
          </CategorySection>
        </CardContent>
      </Card>
    </div>
  );
}
