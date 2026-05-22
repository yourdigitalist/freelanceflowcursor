import { X } from '@/components/icons';
import { cn } from '@/lib/utils';

type LogoPreviewBoxProps = {
  src: string | null | undefined;
  alt: string;
  onRemove?: () => void;
  removing?: boolean;
  className?: string;
};

export function LogoPreviewBox({ src, alt, onRemove, removing, className }: LogoPreviewBoxProps) {
  if (!src) {
    return (
      <div
        className={cn(
          'h-10 w-[140px] shrink-0 rounded border-2 border-dashed border-border bg-muted',
          className,
        )}
      />
    );
  }

  return (
    <div className={cn('group relative h-10 w-[140px] shrink-0', className)}>
      <img
        src={src}
        alt={alt}
        className="h-10 w-full rounded border bg-background p-1 object-contain"
      />
      {onRemove ? (
        <button
          type="button"
          title="Remove logo"
          disabled={removing}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm opacity-0 transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100 disabled:opacity-50"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}
