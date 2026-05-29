/** Unicode em dash — empty placeholder character (not for date ranges). */
export const EMPTY_DASH = '—';

export type EmptyVariant = 'table' | 'detail' | 'inline' | 'document';

const FIELD_COPY: Record<string, string> = {
  company: 'Not set',
  email: 'No email',
  phone: 'No phone',
  tax_id: 'No tax ID',
  address: 'No address',
  notes: 'No notes',
  lead_source: 'Not set',
  next_action: 'Not set',
  next_follow_up: 'None scheduled',
  description: 'Not set',
  project: 'No project',
  task: 'No task',
  client: 'No client',
  status: 'No status',
  value: 'Not set',
};

/** Human-readable empty copy for labeled detail fields. */
export function emptyFieldCopy(field?: string): string {
  if (!field) return 'Not set';
  return FIELD_COPY[field] ?? 'Not set';
}

/** Plain string for formatters, PDFs, and non-React contexts. */
export function emptyDisplayText(options?: {
  variant?: EmptyVariant;
  field?: string;
  /** Force em dash even in detail context (tables, compact cells). */
  dash?: boolean;
}): string {
  const variant = options?.variant ?? 'inline';
  if (options?.dash || variant === 'table' || variant === 'document') {
    return EMPTY_DASH;
  }
  if (options?.field) {
    return emptyFieldCopy(options.field);
  }
  return 'Not set';
}

export function emptyDisplayClassName(variant: EmptyVariant = 'inline'): string {
  switch (variant) {
    case 'table':
      return 'text-xs font-normal text-muted-foreground/60';
    case 'detail':
      return 'text-sm font-normal text-muted-foreground/70';
    case 'document':
      return 'text-muted-foreground/70';
    case 'inline':
    default:
      return 'text-sm font-normal text-muted-foreground/60';
  }
}

/** True when a display string is only the empty dash placeholder. */
export function isEmptyDash(value: string | null | undefined): boolean {
  return value?.trim() === EMPTY_DASH;
}
