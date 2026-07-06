import { describe, expect, it } from 'vitest';
import { formatImportTimeframeLabel } from './invoiceImport';

describe('formatImportTimeframeLabel', () => {
  it('formats a full calendar month', () => {
    expect(formatImportTimeframeLabel('2026-05-01', '2026-05-31')).toBe('Billable hours May 2026');
  });

  it('formats a partial month range', () => {
    expect(formatImportTimeframeLabel('2026-05-10', '2026-05-20')).toBe('Billable hours 10–20 May 2026');
  });

  it('formats a cross-month range', () => {
    expect(formatImportTimeframeLabel('2026-04-28', '2026-05-03')).toBe(
      'Billable hours 28 Apr 2026 – 3 May 2026',
    );
  });

  it('handles all-time imports', () => {
    expect(formatImportTimeframeLabel('', '')).toBe('Billable hours');
  });
});
