import { useState } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { X, Download } from '@/components/icons';
import { cn } from '@/lib/utils';

interface ScheduledDeletionBannerProps {
  scheduledAt: Date;
  onSubscribe?: () => void;
  onDismiss?: () => void;
}

export function ScheduledDeletionBanner({
  scheduledAt,
  onSubscribe,
  onDismiss,
}: ScheduledDeletionBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Not signed in');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/export-account-data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lance-account-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  if (dismissed) return null;

  const daysLeft = Math.max(0, differenceInCalendarDays(scheduledAt, new Date()));
  const deletionLabel = format(scheduledAt, 'MMMM d, yyyy');
  const urgent = daysLeft <= 1;

  return (
    <div
      className={cn(
        'sticky top-0 z-40 py-2 px-4 text-center text-sm font-medium relative',
        urgent ? 'bg-destructive text-destructive-foreground' : 'bg-amber-500 text-white',
      )}
    >
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <span>
          {daysLeft <= 1
            ? `Your account will be deactivated tomorrow (${deletionLabel}) unless you subscribe.`
            : `Your account is scheduled for deletion on ${deletionLabel} (${daysLeft} days). Subscribe to keep your data.`}
        </span>
        <Button
          size="sm"
          variant={urgent ? 'secondary' : 'outline'}
          className="h-7 text-xs shrink-0"
          onClick={onSubscribe}
        >
          Subscribe
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs shrink-0 bg-white/10 border-white/40 text-inherit hover:bg-white/20"
          onClick={() => { void handleExport(); }}
          disabled={exporting}
        >
          <Download className="h-3 w-3 mr-1" />
          {exporting ? 'Exporting…' : 'Export data'}
        </Button>
      </div>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          onDismiss?.();
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-inherit/80 hover:text-inherit"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
