import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

type SidebarNavCollapsedTooltipProps = {
  label: string;
  children: ReactNode;
};

/** Collapsed-sidebar label flyout — matches SidebarNavFlyout panel position and typography. */
export function SidebarNavCollapsedTooltip({ label, children }: SidebarNavCollapsedTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      {children}
      <div
        className={cn(
          'absolute left-full top-0 z-[200] flex items-stretch',
          open ? 'pointer-events-auto visible' : 'pointer-events-none invisible',
        )}
      >
        <div className="w-3 shrink-0" aria-hidden />
        <div className="min-w-[220px] rounded-2xl border border-white/10 bg-[#333333] px-3 py-2.5 shadow-xl">
          <p className="px-2 text-[13px] font-semibold text-white">{label}</p>
        </div>
      </div>
    </div>
  );
}
