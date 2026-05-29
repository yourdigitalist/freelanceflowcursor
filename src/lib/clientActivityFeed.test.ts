import { describe, expect, it } from 'vitest';
import { buildClientActivityFeed } from './clientActivityFeed';

describe('buildClientActivityFeed', () => {
  it('sorts events newest first and includes client created', () => {
    const items = buildClientActivityFeed({
      clientCreatedAt: '2026-01-14T10:00:00Z',
      activities: [],
      proposals: [
        {
          id: 'p1',
          identifier: 'Brand + Gym Signage',
          status: 'sent',
          sent_at: '2026-01-27T10:00:00Z',
          accepted_at: null,
          created_at: '2026-01-20T10:00:00Z',
        },
      ],
      contracts: [],
      invoices: [],
      notes: [],
      timeEntries: [
        {
          id: 't1',
          description: 'discovery call',
          started_at: '2026-01-23T10:00:00Z',
          start_time: null,
          total_duration_seconds: 5400,
          duration_minutes: null,
          tasks: null,
        },
      ],
    });

    expect(items[0]?.id).toBe('proposal-sent-p1');
    expect(items.some((item) => item.id === 'client-created')).toBe(true);
    expect(items.find((item) => item.id === 'time-t1')?.parts.some((p) => p.bold && p.text === '1.5h')).toBe(true);
  });
});
