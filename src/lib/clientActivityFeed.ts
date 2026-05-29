import { formatClientLastActivity } from '@/lib/clientDisplay';

export type ClientActivityRecord = {
  id: string;
  type: 'note' | 'email' | 'call' | 'meeting' | 'other';
  body: string;
  occurred_at: string;
};

export type ClientActivityFeedSource = {
  clientCreatedAt: string;
  activities: ClientActivityRecord[];
  proposals: Array<{
    id: string;
    identifier: string;
    status: string;
    sent_at: string | null;
    accepted_at: string | null;
    created_at: string;
  }>;
  contracts: Array<{
    id: string;
    identifier: string;
    status: string;
    sent_at: string | null;
    created_at: string;
  }>;
  invoices: Array<{
    id: string;
    invoice_number: string;
    status: string;
    created_at: string;
    updated_at: string;
  }>;
  notes: Array<{
    id: string;
    title: string;
    note_comment: string | null;
    content: string | null;
    created_at: string;
  }>;
  timeEntries: Array<{
    id: string;
    description: string | null;
    started_at: string | null;
    start_time: string | null;
    total_duration_seconds: number | null;
    duration_minutes: number | null;
    tasks?: { title: string } | null;
  }>;
};

export type ActivityLinePart = { text: string; bold?: boolean };

export type ClientActivityFeedItem = {
  id: string;
  occurredAt: string;
  parts: ActivityLinePart[];
};

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatHoursShort(seconds: number): string {
  const hours = seconds / 3600;
  if (hours <= 0) return '0h';
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `${minutes}m`;
  }
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}h` : `${rounded}h`;
}

function entrySeconds(entry: ClientActivityFeedSource['timeEntries'][number]) {
  if (entry.total_duration_seconds != null && entry.total_duration_seconds > 0) {
    return entry.total_duration_seconds;
  }
  return (entry.duration_minutes || 0) * 60;
}

function activityTypeLabel(type: ClientActivityRecord['type']) {
  switch (type) {
    case 'email':
      return 'Email logged';
    case 'call':
      return 'Call logged';
    case 'meeting':
      return 'Meeting logged';
    case 'other':
      return 'Activity logged';
    default:
      return 'Note added';
  }
}

function noteSnippet(note: ClientActivityFeedSource['notes'][number]) {
  const raw = (note.note_comment || note.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!raw) return note.title;
  return raw.length > 80 ? `${raw.slice(0, 77)}…` : raw;
}

export function buildClientActivityFeed(source: ClientActivityFeedSource): ClientActivityFeedItem[] {
  const items: ClientActivityFeedItem[] = [];

  const clientCreated = parseDate(source.clientCreatedAt);
  if (clientCreated) {
    items.push({
      id: 'client-created',
      occurredAt: clientCreated.toISOString(),
      parts: [{ text: 'Client created' }],
    });
  }

  source.activities.forEach((activity) => {
    const at = parseDate(activity.occurred_at);
    if (!at) return;
    const label = activityTypeLabel(activity.type);
    items.push({
      id: `activity-${activity.id}`,
      occurredAt: at.toISOString(),
      parts: [
        { text: `${label} — ` },
        { text: `"${activity.body}"`, bold: true },
      ],
    });
  });

  source.proposals.forEach((proposal) => {
    const sentAt = parseDate(proposal.sent_at);
    if (sentAt && ['sent', 'read', 'accepted', 'archived'].includes(proposal.status)) {
      items.push({
        id: `proposal-sent-${proposal.id}`,
        occurredAt: sentAt.toISOString(),
        parts: [
          { text: 'Proposal ' },
          { text: `"${proposal.identifier}"`, bold: true },
          { text: ' sent' },
        ],
      });
    }
    const acceptedAt = parseDate(proposal.accepted_at);
    if (acceptedAt && proposal.status === 'accepted') {
      items.push({
        id: `proposal-accepted-${proposal.id}`,
        occurredAt: acceptedAt.toISOString(),
        parts: [
          { text: 'Proposal ' },
          { text: `"${proposal.identifier}"`, bold: true },
          { text: ' accepted' },
        ],
      });
    }
  });

  source.contracts.forEach((contract) => {
    const sentAt = parseDate(contract.sent_at);
    if (sentAt && contract.status !== 'draft') {
      items.push({
        id: `contract-sent-${contract.id}`,
        occurredAt: sentAt.toISOString(),
        parts: [
          { text: 'Contract ' },
          { text: contract.identifier, bold: true },
          { text: ' sent' },
        ],
      });
    }
  });

  source.invoices.forEach((invoice) => {
    if (!['sent', 'paid', 'overdue'].includes(invoice.status || '')) return;
    const at = parseDate(invoice.updated_at) || parseDate(invoice.created_at);
    if (!at) return;
    items.push({
      id: `invoice-${invoice.status}-${invoice.id}`,
      occurredAt: at.toISOString(),
      parts: [
        { text: 'Invoice ' },
        { text: invoice.invoice_number, bold: true },
        { text: invoice.status === 'paid' ? ' paid' : ' sent' },
      ],
    });
  });

  source.notes.forEach((note) => {
    const at = parseDate(note.created_at);
    if (!at) return;
    const snippet = noteSnippet(note);
    items.push({
      id: `note-${note.id}`,
      occurredAt: at.toISOString(),
      parts: [
        { text: 'Note added — ' },
        { text: `"${snippet}"`, bold: true },
      ],
    });
  });

  source.timeEntries.forEach((entry) => {
    const at = parseDate(entry.started_at || entry.start_time);
    if (!at) return;
    const seconds = entrySeconds(entry);
    if (seconds <= 0) return;
    const detail = entry.description?.trim() || entry.tasks?.title?.trim() || 'time entry';
    items.push({
      id: `time-${entry.id}`,
      occurredAt: at.toISOString(),
      parts: [
        { text: 'Logged ' },
        { text: formatHoursShort(seconds), bold: true },
        { text: ` · ${detail}` },
      ],
    });
  });

  items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  return items;
}

export function formatActivityFeedTimestamp(iso: string, dateFormat?: string): string {
  return formatClientLastActivity(iso, dateFormat);
}
