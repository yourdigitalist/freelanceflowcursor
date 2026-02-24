import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Megaphone } from 'lucide-react';

export default function AdminAnnouncements() {
  const { toast } = useToast();
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('get_announcement_recipient_count');
      if (cancelled) return;
      if (error) {
        console.error(error);
        setRecipientCount(0);
      } else {
        setRecipientCount(typeof data === 'number' ? data : 0);
      }
      setLoadingCount(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-announcement', {
        body: {
          title: trimmedTitle,
          body: body.trim() || undefined,
          link: link.trim() || undefined,
          send_email: sendEmail,
        },
      });
      if (error) throw error;
      const result = data as { error?: string; in_app_sent?: number; emails_sent?: number } | null;
      if (result?.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }
      toast({
        title: 'Announcement sent',
        description: `${result?.in_app_sent ?? 0} in-app notification(s), ${result?.emails_sent ?? 0} email(s) sent.`,
      });
      setTitle('');
      setBody('');
      setLink('');
    } catch (err: any) {
      toast({
        title: 'Failed to send',
        description: err?.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
        <p className="text-muted-foreground mt-1">
          Send a message to all active users (in-app and optionally by email). Active = completed onboarding and has an email.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            New announcement
          </CardTitle>
          <CardDescription>
            {loadingCount ? 'Loading recipient count…' : `Will be sent to ${recipientCount ?? 0} user(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="announcement-title">Title *</Label>
              <Input
                id="announcement-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New feature: Time reports"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-body">Body (optional)</Label>
              <Textarea
                id="announcement-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Short description or call to action."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announcement-link">Link (optional)</Label>
              <Input
                id="announcement-link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-base">Also send by email</Label>
                <p className="text-xs text-muted-foreground">Uses Resend. Requires RESEND_API_KEY.</p>
              </div>
              <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
            </div>
            <Button type="submit" disabled={sending || loadingCount || (recipientCount ?? 0) === 0}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" />
              Send to {recipientCount ?? 0} users
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
