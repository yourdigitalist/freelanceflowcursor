import { formatActivityFeedTimestamp, type ClientActivityFeedItem } from '@/lib/clientActivityFeed';
import { useLocalePreferences } from '@/hooks/useLocalePreferences';
import { cn } from '@/lib/utils';

type ClientActivityTimelineProps = {
  items: ClientActivityFeedItem[];
  loading?: boolean;
  highlightItemId?: string;
  className?: string;
};

export function ClientActivityTimeline({
  items,
  loading,
  highlightItemId,
  className,
}: ClientActivityTimelineProps) {
  const { dateFormat } = useLocalePreferences();

  return (
    <div className={className}>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading activity…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="relative space-y-5 border-l border-border/80 pl-4">
          {items.map((item) => (
            <li key={item.id} className="relative pl-1">
              <span
                className={cn(
                  'absolute -left-[calc(1rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full border-2 bg-background',
                  item.id === highlightItemId ? 'border-primary' : 'border-muted-foreground/35',
                )}
                aria-hidden
              />
              <p className="text-sm leading-snug text-foreground">
                {item.parts.map((part, partIndex) =>
                  part.bold ? (
                    <strong key={partIndex} className="font-semibold">
                      {part.text}
                    </strong>
                  ) : (
                    <span key={partIndex}>{part.text}</span>
                  ),
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatActivityFeedTimestamp(item.occurredAt, dateFormat)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
