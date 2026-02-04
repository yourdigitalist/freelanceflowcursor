import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useSettingsDirty } from '@/contexts/SettingsDirtyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  NotificationPreferences,
  mergeWithDefaults,
  getDefaultPreferences,
  type DuePref,
  type ChannelPref,
} from '@/lib/notification-preferences';
import { Loader2, FolderKanban, ListTodo, FileText, MessageSquare, Upload } from 'lucide-react';

const DAYS_OPTIONS = [1, 3, 7, 14];

export default function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const dirtyContext = useSettingsDirty();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>(getDefaultPreferences());

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ notification_preferences: prefs })
      .eq('user_id', user.id);
    if (error) throw error;
    toast({ title: 'Notification preferences saved' });
    dirtyContext?.setDirty(false);
  };

  const discard = () => {
    fetchProfile();
    dirtyContext?.setDirty(false);
  };

  useEffect(() => {
    dirtyContext?.registerHandlers(save, discard);
  }, [dirtyContext, prefs]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      setPrefs(mergeWithDefaults((data?.notification_preferences as NotificationPreferences) ?? undefined));
    } catch (e) {
      console.error('Error fetching notification preferences:', e);
      setPrefs(mergeWithDefaults(undefined));
    } finally {
      setLoading(false);
    }
  };

  const markDirty = () => dirtyContext?.setDirty(true);

  const update = (updater: (prev: NotificationPreferences) => NotificationPreferences) => {
    setPrefs(updater);
    markDirty();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await save();
    } catch (err: any) {
      toast({ title: 'Error saving', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Choose what you receive in-app and by email. Billing notifications are always sent by your payment provider.
        </p>
      </div>

      {/* Projects */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderKanban className="h-4 w-4" />
            Projects
          </CardTitle>
          <CardDescription>Project due soon and overdue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DueSection
            duePref={prefs.projects}
            onChange={(projects) => update((p) => ({ ...p, projects }))}
            markDirty={markDirty}
          />
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-4 w-4" />
            Tasks
          </CardTitle>
          <CardDescription>Task due soon and overdue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DueSection
            duePref={prefs.tasks}
            onChange={(tasks) => update((p) => ({ ...p, tasks }))}
            markDirty={markDirty}
          />
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Invoices
          </CardTitle>
          <CardDescription>Due soon, overdue, sent confirmation, and paid</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DueSection
            duePref={{
              dueSoon: prefs.invoices?.dueSoon,
              overdue: prefs.invoices?.overdue,
              daysBefore: prefs.invoices?.daysBefore ?? 7,
            }}
            onChange={(due) =>
              update((p) => ({
                ...p,
                invoices: {
                  ...p.invoices,
                  dueSoon: due.dueSoon,
                  overdue: due.overdue,
                  daysBefore: due.daysBefore,
                },
              }))
            }
            markDirty={markDirty}
          />
          <ChannelRow
            label="Invoice sent"
            inApp={prefs.invoices?.sent?.inApp ?? true}
            email={prefs.invoices?.sent?.email ?? true}
            onInApp={(v) =>
              update((p) => ({
                ...p,
                invoices: { ...p.invoices, sent: { ...p.invoices?.sent, inApp: v } },
              }))
            }
            onEmail={(v) =>
              update((p) => ({
                ...p,
                invoices: { ...p.invoices, sent: { ...p.invoices?.sent, email: v } },
              }))
            }
          />
          <ChannelRow
            label="Invoice paid"
            inApp={prefs.invoices?.paid?.inApp ?? true}
            email={prefs.invoices?.paid?.email ?? true}
            onInApp={(v) =>
              update((p) => ({
                ...p,
                invoices: { ...p.invoices, paid: { ...p.invoices?.paid, inApp: v } },
              }))
            }
            onEmail={(v) =>
              update((p) => ({
                ...p,
                invoices: { ...p.invoices, paid: { ...p.invoices?.paid, email: v } },
              }))
            }
          />
        </CardContent>
      </Card>

      {/* Reviews */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Reviews
          </CardTitle>
          <CardDescription>Client review comments, status changes, and due dates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChannelRow
            label="New review comment"
            inApp={prefs.reviews?.comment?.inApp ?? true}
            email={prefs.reviews?.comment?.email ?? true}
            onInApp={(v) =>
              update((p) => ({
                ...p,
                reviews: { ...p.reviews, comment: { ...p.reviews?.comment, inApp: v } },
              }))
            }
            onEmail={(v) =>
              update((p) => ({
                ...p,
                reviews: { ...p.reviews, comment: { ...p.reviews?.comment, email: v } },
              }))
            }
          />
          <ChannelRow
            label="Review submitted / approved / rejected"
            inApp={prefs.reviews?.status?.inApp ?? true}
            email={prefs.reviews?.status?.email ?? true}
            onInApp={(v) =>
              update((p) => ({
                ...p,
                reviews: { ...p.reviews, status: { ...p.reviews?.status, inApp: v } },
              }))
            }
            onEmail={(v) =>
              update((p) => ({
                ...p,
                reviews: { ...p.reviews, status: { ...p.reviews?.status, email: v } },
              }))
            }
          />
          <DueSection
            duePref={{
              dueSoon: prefs.reviews?.dueSoon,
              overdue: prefs.reviews?.overdue,
              daysBefore: prefs.reviews?.daysBefore ?? 7,
            }}
            onChange={(due) =>
              update((p) => ({
                ...p,
                reviews: {
                  ...p.reviews,
                  dueSoon: due.dueSoon,
                  overdue: due.overdue,
                  daysBefore: due.daysBefore,
                },
              }))
            }
            markDirty={markDirty}
          />
        </CardContent>
      </Card>

      {/* Import / Export */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            Import & Export
          </CardTitle>
          <CardDescription>When a CSV export is ready or an import finishes</CardDescription>
        </CardHeader>
        <CardContent>
          <ChannelRow
            label="Export ready / Import completed"
            inApp={prefs.importExport?.inApp ?? true}
            email={prefs.importExport?.email ?? true}
            onInApp={(v) =>
              update((p) => ({ ...p, importExport: { ...p.importExport, inApp: v } }))
            }
            onEmail={(v) =>
              update((p) => ({ ...p, importExport: { ...p.importExport, email: v } }))
            }
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}

function ChannelRow({
  label,
  inApp,
  email,
  onInApp,
  onEmail,
}: {
  label: string;
  inApp: boolean;
  email: boolean;
  onInApp: (v: boolean) => void;
  onEmail: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Label htmlFor={`inapp-${label}`} className="text-muted-foreground text-xs">
            In-app
          </Label>
          <Switch id={`inapp-${label}`} checked={inApp} onCheckedChange={onInApp} />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`email-${label}`} className="text-muted-foreground text-xs">
            Email
          </Label>
          <Switch id={`email-${label}`} checked={email} onCheckedChange={onEmail} />
        </div>
      </div>
    </div>
  );
}

function DueSection({
  duePref,
  onChange,
  markDirty,
}: {
  duePref: DuePref | undefined;
  onChange: (pref: DuePref) => void;
  markDirty: () => void;
}) {
  const dueSoon = duePref?.dueSoon ?? { inApp: true, email: true };
  const overdue = duePref?.overdue ?? { inApp: true, email: true };
  const daysBefore = duePref?.daysBefore ?? 7;

  const setChannel = (which: 'dueSoon' | 'overdue', channel: keyof ChannelPref, value: boolean) => {
    const next = which === 'dueSoon'
      ? { ...dueSoon, [channel]: value }
      : { ...overdue, [channel]: value };
    onChange({
      ...duePref,
      dueSoon: which === 'dueSoon' ? next : dueSoon,
      overdue: which === 'overdue' ? next : overdue,
      daysBefore,
    });
    markDirty();
  };

  return (
    <>
      <ChannelRow
        label="Due soon"
        inApp={dueSoon.inApp ?? true}
        email={dueSoon.email ?? true}
        onInApp={(v) => setChannel('dueSoon', 'inApp', v)}
        onEmail={(v) => setChannel('dueSoon', 'email', v)}
      />
      <ChannelRow
        label="Overdue"
        inApp={overdue.inApp ?? true}
        email={overdue.email ?? true}
        onInApp={(v) => setChannel('overdue', 'inApp', v)}
        onEmail={(v) => setChannel('overdue', 'email', v)}
      />
      <div className="flex flex-wrap items-center gap-4 py-2">
        <Label className="text-sm font-medium">Remind me (days before due)</Label>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={daysBefore}
          onChange={(e) => {
            onChange({ ...duePref, daysBefore: Number(e.target.value) });
            markDirty();
          }}
        >
          {DAYS_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d} {d === 1 ? 'day' : 'days'}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
