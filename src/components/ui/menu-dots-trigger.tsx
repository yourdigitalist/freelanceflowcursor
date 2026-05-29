import * as React from 'react';
import { MoreVertical } from '@/components/icons';
import { DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { menuDotsTriggerClass, toolbarIconMutedClass } from '@/lib/toolbarIcons';
import { cn } from '@/lib/utils';

type MenuDotsTriggerProps = React.ComponentPropsWithoutRef<typeof DropdownMenuTrigger> & {
  /** @default "More options" */
  label?: string;
  buttonClassName?: string;
  iconClassName?: string;
};

export function MenuDotsTrigger({
  label = 'More options',
  buttonClassName,
  iconClassName,
  ...props
}: MenuDotsTriggerProps) {
  return (
    <DropdownMenuTrigger asChild {...props}>
      <button
        type="button"
        aria-label={label}
        className={cn(menuDotsTriggerClass, buttonClassName)}
        onClick={(e) => e.stopPropagation()}
      >
        <MoreVertical className={cn(toolbarIconMutedClass, iconClassName)} />
      </button>
    </DropdownMenuTrigger>
  );
}
