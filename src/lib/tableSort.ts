/** Shared comparators for client-side table sorting (use with useTableSort). */

export function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

export function compareNumbers(a: number, b: number): number {
  return a - b;
}

export function compareNullableNumbers(
  a: number | null | undefined,
  b: number | null | undefined,
  empty = -Infinity,
): number {
  return compareNumbers(a ?? empty, b ?? empty);
}

export function compareDates(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const ta = a ? new Date(a).getTime() : 0;
  const tb = b ? new Date(b).getTime() : 0;
  return compareNumbers(ta, tb);
}

export function compareBooleans(a: boolean, b: boolean): number {
  return Number(a) - Number(b);
}
