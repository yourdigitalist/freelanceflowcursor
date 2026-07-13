import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatLocaleDateTime } from '@/lib/datetime';

export type InvoiceActivitySource = {
  created_at: string;
  updated_at: string;
  sent_at?: string | null;
  last_sent_at?: string | null;
  last_reminder_sent_at?: string | null;
  last_reminder_automatic?: boolean | null;
  paid_date?: string | null;
  status?: string | null;
};

type ActivityEntry = {
  key: string;
  label: string;
  at: string;
  detail?: string;
};

type Props = {
  invoice: InvoiceActivitySource;
  dateFormat: string;
};

export function InvoiceActivityLog({ invoice, dateFormat }: Props) {
  const entries = useMemo(() => {
    const list: ActivityEntry[] = [];

    if (invoice.created_at) {
      list.push({
        key: 'created',
        label: 'Created',
        at: invoice.created_at,
      });
    }

    if (invoice.updated_at && invoice.updated_at !== invoice.created_at) {
      list.push({
        key: 'updated',
        label: 'Last saved',
        at: invoice.updated_at,
      });
    }

    if (invoice.sent_at) {
      list.push({
        key: 'sent',
        label: 'First sent to client',
        at: invoice.sent_at,
      });
    }

    if (
      invoice.last_sent_at &&
      invoice.last_sent_at !== invoice.sent_at
    ) {
      list.push({
        key: 'last-sent',
        label: 'Last sent to client',
        at: invoice.last_sent_at,
      });
    }

    if (invoice.last_reminder_sent_at) {
      list.push({
        key: 'reminder',
        label: invoice.last_reminder_automatic
          ? 'Automatic reminder sent'
          : 'Manual reminder sent',
        at: invoice.last_reminder_sent_at,
      });
    }

    if (invoice.paid_date) {
      list.push({
        key: 'paid',
        label: 'Marked as paid',
        at: invoice.paid_date.includes('T') ? invoice.paid_date : `${invoice.paid_date}T12:00:00`,
        detail: invoice.status === 'paid' ? 'Status: Paid' : undefined,
      });
    }

    return list.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [invoice]);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Activity</CardTitle>
        <CardDescription>
          Invoice history — sends, reminders, and status changes.
          Automatic reminders go out based on your Settings → Invoice reminder days before due date.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.key} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between border-b border-border/60 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{entry.label}</p>
                  {entry.detail ? (
                    <p className="text-xs text-muted-foreground">{entry.detail}</p>
                  ) : null}
                </div>
                <time className="text-sm text-muted-foreground shrink-0" dateTime={entry.at}>
                  {formatLocaleDateTime(entry.at, dateFormat)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
