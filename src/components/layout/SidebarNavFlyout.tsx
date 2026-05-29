import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { shellFlyoutLink, shellNavLink } from './shellNav';

export interface SidebarFlyoutLink {
  to: string;
  label: string;
  isActive: boolean;
}

interface SidebarNavFlyoutProps {
  title: string;
  icon: ReactNode;
  links: SidebarFlyoutLink[];
  isSectionActive: boolean;
  onNavigate?: () => void;
}

export function SidebarNavFlyout({
  title,
  icon,
  links,
  isSectionActive,
  onNavigate,
}: SidebarNavFlyoutProps) {
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
      <button
        type="button"
        className={shellNavLink(isSectionActive, true)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {icon}
      </button>

      {/* Bridge + panel sit outside scroll clipping; high z-index over main content */}
      <div
        className={cn(
          'absolute left-full top-0 z-[200] flex items-stretch',
          open ? 'pointer-events-auto visible' : 'pointer-events-none invisible',
        )}
      >
        <div className="w-3 shrink-0" aria-hidden />
        <div className="min-w-[220px] rounded-2xl border border-white/10 bg-[#333333] p-3 shadow-xl">
          <p className="mb-2 px-2 text-[13px] font-semibold text-white">{title}</p>
          <nav className="space-y-1.5">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={onNavigate}
                className={shellFlyoutLink(link.isActive)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
