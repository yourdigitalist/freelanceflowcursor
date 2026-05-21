import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PRIORITY_OPTIONS } from './types';

const PRIORITY_NONE = 'none';

const priorityLabelClass: Record<string, string> = {
  low: 'text-muted-foreground',
  medium: 'text-primary',
  high: 'text-amber-700 dark:text-amber-500',
  urgent: 'text-destructive',
};

export function priorityToSelectValue(priority: string | null | undefined): string {
  return priority && PRIORITY_OPTIONS.some((p) => p.value === priority) ? priority : PRIORITY_NONE;
}

export function priorityFromSelectValue(value: string): string | null {
  return value === PRIORITY_NONE ? null : value;
}

export function PriorityBadge({ priority, className }: { priority: string | null | undefined; className?: string }) {
  if (!priority) {
    return <span className={cn('text-xs text-muted-foreground', className)}>No priority</span>;
  }
  const config = PRIORITY_OPTIONS.find((p) => p.value === priority);
  if (!config) return null;
  return (
    <Badge className={cn(config.color, className)} variant="secondary">
      {config.label}
    </Badge>
  );
}

type PrioritySelectProps = {
  value: string | null | undefined;
  onValueChange: (priority: string | null) => void;
  includeNone?: boolean;
  triggerClassName?: string;
  placeholder?: string;
};

export function PrioritySelect({
  value,
  onValueChange,
  includeNone = true,
  triggerClassName,
  placeholder = 'Priority',
}: PrioritySelectProps) {
  const selectValue = priorityToSelectValue(value);

  return (
    <Select
      value={selectValue}
      onValueChange={(next) => onValueChange(priorityFromSelectValue(next))}
    >
      <SelectTrigger className={triggerClassName}>
        {value ? (
          <PriorityBadge priority={value} />
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent className="[&_[data-highlighted]]:bg-muted [&_[data-highlighted]]:text-foreground">
        {includeNone ? (
          <SelectItem value={PRIORITY_NONE}>
            <span className="text-muted-foreground">No priority</span>
          </SelectItem>
        ) : null}
        {PRIORITY_OPTIONS.map((priority) => (
          <SelectItem key={priority.value} value={priority.value}>
            <span className={cn('text-sm font-medium', priorityLabelClass[priority.value])}>{priority.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
