import { formatStatusLabel, getTableStatusBadgeStyles } from '@/lib/statusDisplay';
import { cn } from '@/lib/utils';

type TableStatusBadgeProps = {
  status?: string | null;
  label?: string;
  className?: string;
};

export function TableStatusBadge({ status, label, className }: TableStatusBadgeProps) {
  const styles = getTableStatusBadgeStyles(status);
  const text = label ?? formatStatusLabel(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles.badge,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', styles.dot)} aria-hidden />
      {text}
    </span>
  );
}
