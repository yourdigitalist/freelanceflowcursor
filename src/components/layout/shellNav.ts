import { cn } from '@/lib/utils';

/** Nav link styles for #333 shell only — does not affect page content. (text-xs = 12px, 2px below text-sm) */
export const shellNavLink = (active: boolean, collapsed?: boolean) =>
  cn(
    'group/nav flex w-full items-center gap-3 rounded-full text-xs font-medium transition-colors',
    collapsed ? 'min-h-[2.25rem] justify-center px-0 py-2' : 'px-3 py-2',
    active
      ? 'bg-[#4D4D4D] !text-white'
      : 'text-white/75 hover:bg-[#4D4D4D] hover:!text-white',
  );

export const shellNavIcon = (active: boolean) =>
  cn(
    'h-4 w-4 shrink-0 transition-colors',
    active ? 'text-white' : 'text-white/75 group-hover/nav:text-white',
  );

export const shellSubNavLink = (active: boolean) =>
  cn(
    'block rounded-full px-3 py-1.5 text-xs transition-colors',
    active
      ? 'bg-[#4D4D4D] font-medium !text-white'
      : 'text-white/75 hover:bg-[#4D4D4D] hover:!text-white',
  );

export const shellFlyoutLink = (active: boolean) =>
  cn(
    'block rounded-full px-3 py-1.5 text-xs transition-colors',
    active
      ? 'bg-[#4D4D4D] font-medium !text-white'
      : 'text-white/75 hover:bg-[#4D4D4D] hover:!text-white',
  );
