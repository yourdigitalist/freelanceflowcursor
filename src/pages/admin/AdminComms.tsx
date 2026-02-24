import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, FileText, Mail } from 'lucide-react';

interface AppCommsDefaults {
  id: number;
  invoice_footer: string | null;
  invoice_email_subject_default: string | null;
  invoice_email_message_default: string | null;
  reminder_subject_default: string | null;
  reminder_body_default: string | null;
  email_header_html: string | null;
  email_footer_html: string | null;
  lance_email_header_html: string | null;
  lance_email_footer_html: string | null;
  trial_body_5d: string | null;
  trial_body_1d: string | null;
  trial_body_0d: string | null;
  announcement_default_body: string | null;
  announcement_custom_html: string | null;
  updated_at: string;
}

const defaultInvoiceEmailSubject = 'Invoice {{invoice_number}} from {{business_name}}';
const defaultReminderSubject = 'Reminder: Invoice {{invoice_number}} Due Soon';
const defaultReminderBody = `Hi {{client_name}},
This is a friendly reminder that invoice {{invoice_number}} for {{project_name}} is due on {{due_date}}.
Please let us know if you have any questions.`;

export default function AdminComms() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AppCommsDefaults>({
    id: 1,
    invoice_footer: null,
    invoice_email_subject_default: null,
    invoice_email_message_default: null,
    reminder_subject_default: null,
    reminder_body_default: null,
    email_header_html: null,
    email_footer_html: null,
    lance_email_header_html: null,
    lance_email_footer_html: null,
    trial_body_5d: null,
    trial_body_1d: null,
    trial_body_0d: null,
    announcement_default_body: null,
    announcement_custom_html: null,
    updated_at: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('app_comms_defaults')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast({ title: 'Error loading defaults', description: error.message, variant: 'destructive' });
      } else if (data) {
        setForm({
          id: 1,
          invoice_footer: data.invoice_footer ?? null,
          invoice_email_subject_default: data.invoice_email_subject_default ?? null,
          invoice_email_message_default: data.invoice_email_message_default ?? null,
          reminder_subject_default: data.reminder_subject_default ?? null,
          reminder_body_default: data.reminder_body_default ?? null,
          email_header_html: data.email_header_html ?? null,
          email_footer_html: data.email_footer_html ?? null,
          lance_email_header_html: data.lance_email_header_html ?? null,
          lance_email_footer_html: data.lance_email_footer_html ?? null,
          trial_body_5d: data.trial_body_5d ?? null,
          trial_body_1d: data.trial_body_1d ?? null,
          trial_body_0d: data.trial_body_0d ?? null,
          announcement_default_body: data.announcement_default_body ?? null,
          announcement_custom_html: data.announcement_custom_html ?? null,
          updated_at: data.updated_at ?? '',
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_comms_defaults')
        .update({
          invoice_footer: form.invoice_footer || null,
          invoice_email_subject_default: form.invoice_email_subject_default || null,
          invoice_email_message_default: form.invoice_email_message_default || null,
          reminder_subject_default: form.reminder_subject_default || null,
          reminder_body_default: form.reminder_body_default || null,
          email_header_html: form.email_header_html || null,
          email_footer_html: form.email_footer_html || null,
          lance_email_header_html: form.lance_email_header_html || null,
          lance_email_footer_html: form.lance_email_footer_html || null,
          trial_body_5d: form.trial_body_5d || null,
          trial_body_1d: form.trial_body_1d || null,
          trial_body_0d: form.trial_body_0d || null,
          announcement_default_body: form.announcement_default_body || null,
          announcement_custom_html: form.announcement_custom_html || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
      if (error) throw error;
      toast({ title: 'Comms defaults saved' });
    } catch (err: any) {
      toast({ title: 'Error saving', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof AppCommsDefaults, value: string | null) => {
    if (key === 'id' || key === 'updated_at') return;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comms & templates</h1>
        <p className="text-muted-foreground mt-1">
          Configure Lance-to-user comms and default templates users can inherit for client-facing comms.
        </p>
      </div>
      <form onSubmit={handleSave} className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Lance → User email wrapper
          </CardTitle>
          <CardDescription>Used by trial reminders and announcements unless custom HTML is provided.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lance_email_header">Header HTML</Label>
            <Textarea
              id="lance_email_header"
              value={form.lance_email_header_html ?? ''}
              onChange={(e) => update('lance_email_header_html', e.target.value || null)}
              placeholder="Use tokens like {{logo_url}}, {{primary_color}}, {{body_html}}"
              rows={4}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lance_email_footer">Footer HTML</Label>
            <Textarea
              id="lance_email_footer"
              value={form.lance_email_footer_html ?? ''}
              onChange={(e) => update('lance_email_footer_html', e.target.value || null)}
              placeholder="Use tokens like {{primary_color}}"
              rows={3}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Lance automated body copy</CardTitle>
          <CardDescription>Default bodies for trial reminders and announcements to users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trial_body_5d">Trial body (5 days left)</Label>
            <Textarea
              id="trial_body_5d"
              value={form.trial_body_5d ?? ''}
              onChange={(e) => update('trial_body_5d', e.target.value || null)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trial_body_1d">Trial body (1 day left)</Label>
            <Textarea
              id="trial_body_1d"
              value={form.trial_body_1d ?? ''}
              onChange={(e) => update('trial_body_1d', e.target.value || null)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trial_body_0d">Trial body (ends today)</Label>
            <Textarea
              id="trial_body_0d"
              value={form.trial_body_0d ?? ''}
              onChange={(e) => update('trial_body_0d', e.target.value || null)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement_default_body">Announcement default body</Label>
            <Textarea
              id="announcement_default_body"
              value={form.announcement_default_body ?? ''}
              onChange={(e) => update('announcement_default_body', e.target.value || null)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement_custom_html">Announcement custom HTML (optional full template)</Label>
            <Textarea
              id="announcement_custom_html"
              value={form.announcement_custom_html ?? ''}
              onChange={(e) => update('announcement_custom_html', e.target.value || null)}
              rows={5}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice defaults
            </CardTitle>
            <CardDescription>Default footer and email templates for new invoices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_footer">Invoice footer</Label>
              <Textarea
                id="invoice_footer"
                value={form.invoice_footer ?? ''}
                onChange={(e) => update('invoice_footer', e.target.value || null)}
                placeholder="Thank you for your business!"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_email_subject">Default invoice email subject</Label>
              <Input
                id="invoice_email_subject"
                value={form.invoice_email_subject_default ?? ''}
                onChange={(e) => update('invoice_email_subject_default', e.target.value || null)}
                placeholder={defaultInvoiceEmailSubject}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_email_message">Default invoice email body</Label>
              <Textarea
                id="invoice_email_message"
                value={form.invoice_email_message_default ?? ''}
                onChange={(e) => update('invoice_email_message_default', e.target.value || null)}
                placeholder="Please find your invoice attached."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Reminder defaults</CardTitle>
            <CardDescription>Default subject and body for invoice reminder emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reminder_subject">Default reminder subject</Label>
              <Input
                id="reminder_subject"
                value={form.reminder_subject_default ?? ''}
                onChange={(e) => update('reminder_subject_default', e.target.value || null)}
                placeholder={defaultReminderSubject}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder_body">Default reminder body</Label>
              <Textarea
                id="reminder_body"
                value={form.reminder_body_default ?? ''}
                onChange={(e) => update('reminder_body_default', e.target.value || null)}
                placeholder={defaultReminderBody}
                rows={6}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email wrapper (optional)
            </CardTitle>
            <CardDescription>HTML header and footer for transactional emails. Leave empty to use plain content.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email_header">Email header HTML</Label>
              <Textarea
                id="email_header"
                value={form.email_header_html ?? ''}
                onChange={(e) => update('email_header_html', e.target.value || null)}
                placeholder="<div style='font-family: sans-serif;'>"
                rows={3}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_footer">Email footer HTML</Label>
              <Textarea
                id="email_footer"
                value={form.email_footer_html ?? ''}
                onChange={(e) => update('email_footer_html', e.target.value || null)}
                placeholder="<p>— Your Company</p></div>"
                rows={3}
                className="font-mono text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save defaults
        </Button>
      </form>
    </div>
  );
}
