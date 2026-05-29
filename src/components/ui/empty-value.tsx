import type { ReactNode } from 'react';
import {
  EMPTY_DASH,
  emptyDisplayClassName,
  emptyDisplayText,
  emptyFieldCopy,
  type EmptyVariant,
} from '@/lib/emptyDisplay';
import { cn } from '@/lib/utils';

type EmptyValueProps = {
  variant?: EmptyVariant;
  /** Field key for contextual copy (e.g. email → "No email"). */
  field?: string;
  /** Override displayed text. */
  children?: string;
  className?: string;
};

export function EmptyValue({ variant = 'inline', field, children, className }: EmptyValueProps) {
  const text =
    children ??
    (field && variant !== 'table' && variant !== 'document'
      ? emptyFieldCopy(field)
      : emptyDisplayText({ variant, field, dash: variant === 'table' || variant === 'document' }));

  return (
    <span className={cn(emptyDisplayClassName(variant), className)} aria-label={text === EMPTY_DASH ? 'Empty' : text}>
      {text}
    </span>
  );
}

/** Render value or a soft empty placeholder. */
export function valueOrEmpty(
  value: string | number | null | undefined,
  options?: {
    variant?: EmptyVariant;
    field?: string;
    className?: string;
    format?: (v: string | number) => string;
  },
): ReactNode {
  const trimmed = value === null || value === undefined ? '' : String(value).trim();
  if (!trimmed) {
    return <EmptyValue variant={options?.variant} field={options?.field} className={options?.className} />;
  }
  if (options?.format) {
    return options.format(value as string | number);
  }
  return trimmed;
}
