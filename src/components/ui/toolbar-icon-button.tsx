import * as React from 'react';
import { toolbarIconButtonClass } from '@/lib/toolbarIcons';
import { cn } from '@/lib/utils';

export type ToolbarIconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const ToolbarIconButton = React.forwardRef<HTMLButtonElement, ToolbarIconButtonProps>(
  function ToolbarIconButton({ className, type = 'button', ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(toolbarIconButtonClass, className)}
        {...props}
      />
    );
  },
);
