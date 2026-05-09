import { ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface HorizontalScrollProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function HorizontalScroll({ children, className, contentClassName }: HorizontalScrollProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startScrollLeft, setStartScrollLeft] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateEdges = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };

    updateEdges();
    el.addEventListener('scroll', updateEdges, { passive: true });
    const observer = new ResizeObserver(updateEdges);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', updateEdges);
      observer.disconnect();
    };
  }, []);

  const onMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, input, textarea, select, [role="button"], a')) return;

    const el = containerRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(event.pageX);
    setStartScrollLeft(el.scrollLeft);
  };

  const onMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    event.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const walk = event.pageX - startX;
    el.scrollLeft = startScrollLeft - walk;
  };

  const stopDragging = () => setIsDragging(false);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={cn(
          'overflow-x-auto pb-4 no-scrollbar',
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab',
          className
        )}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
      >
        <div className={contentClassName}>{children}</div>
      </div>

      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent transition-opacity',
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent transition-opacity',
          canScrollRight ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
}
