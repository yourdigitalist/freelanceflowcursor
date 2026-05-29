import { describe, expect, it } from 'vitest';
import {
  EMPTY_DASH,
  emptyDisplayText,
  emptyFieldCopy,
  isEmptyDash,
} from './emptyDisplay';

describe('emptyDisplay', () => {
  it('uses contextual copy for detail fields', () => {
    expect(emptyFieldCopy('email')).toBe('No email');
    expect(emptyFieldCopy('status')).toBe('No status');
    expect(emptyFieldCopy()).toBe('Not set');
  });

  it('uses dash in table variant', () => {
    expect(emptyDisplayText({ variant: 'table', dash: true })).toBe(EMPTY_DASH);
    expect(emptyDisplayText({ variant: 'detail', field: 'company' })).toBe('Not set');
  });

  it('detects empty dash strings', () => {
    expect(isEmptyDash(EMPTY_DASH)).toBe(true);
    expect(isEmptyDash('Not set')).toBe(false);
  });
});
