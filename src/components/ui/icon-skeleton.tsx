import { cn } from '@/lib/utils';

/** Placeholder while a slot icon or logo is loading — never shows a stale/default icon. */
export function IconSkeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block shrink-0 animate-pulse rounded-md bg-current opacity-20',
        className ?? 'h-4 w-4',
      )}
      aria-hidden
    />
  );
}
