import type { ProjectActivity } from '@/lib/projectDisplay';
import { cn } from '@/lib/utils';

type ProjectActivityBadgeProps = {
  activity: ProjectActivity;
  className?: string;
};

export function ProjectActivityBadge({ activity, className }: ProjectActivityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        activity.badgeClass,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', activity.dotClass)} aria-hidden />
      {activity.label}
    </span>
  );
}
