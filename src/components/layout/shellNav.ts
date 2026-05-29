import { cn } from '@/lib/utils';

/** Nav link styles for #333 shell only — does not affect page content. */
const shellNavText = 'text-[13px]';

export const shellNavLink = (active: boolean, collapsed?: boolean) =>
  cn(
    'group/nav flex w-full items-center gap-3 rounded-full font-medium transition-colors',
    shellNavText,
    collapsed ? 'min-h-[2.25rem] justify-center px-0 py-2' : 'px-3 py-2',
    active
      ? 'bg-sidebar-accent !text-white'
      : 'text-white/75 hover:bg-sidebar-accent hover:!text-white',
  );

export const shellNavIcon = (active: boolean) =>
  cn(
    'h-4 w-4 shrink-0 transition-colors',
    active ? 'text-white' : 'text-white/75 group-hover/nav:text-white',
  );

export const shellSubNavLink = (active: boolean) =>
  cn(
    'block rounded-full px-3 py-1.5 transition-colors',
    shellNavText,
    active
      ? 'bg-sidebar-accent font-medium !text-white'
      : 'text-white/75 hover:bg-sidebar-accent hover:!text-white',
  );

export const shellFlyoutLink = (active: boolean) =>
  cn(
    'block rounded-full px-3 py-1.5 transition-colors',
    shellNavText,
    active
      ? 'bg-sidebar-accent font-medium !text-white'
      : 'text-white/75 hover:bg-sidebar-accent hover:!text-white',
  );
