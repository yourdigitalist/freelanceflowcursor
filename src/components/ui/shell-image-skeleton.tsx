import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type ShellImageSkeletonProps = {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
};

/** Image that shows a pulse placeholder until loaded (avoids stale/cached logo flash). */
export function ShellImageWithSkeleton({
  src,
  alt,
  className,
  skeletonClassName,
}: ShellImageSkeletonProps) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center', className)}>
      {!loaded && (
        <span
          className={cn(
            'absolute inset-0 animate-pulse rounded-lg bg-white/20',
            skeletonClassName,
          )}
          aria-hidden
        />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          'max-h-full max-w-full object-contain object-left transition-opacity',
          !loaded && 'opacity-0',
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </span>
  );
}
