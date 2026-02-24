import { Briefcase } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { cn } from '@/lib/utils';

type AppLogoProps = {
  /** Use full logo (logo_url) when true, icon when false. Default true. */
  full?: boolean;
  className?: string;
  /** Height in pixels for img (width auto). Default 32 for full, 32 for icon. */
  height?: number;
  alt?: string;
};

/**
 * Shows the app logo from admin branding (full logo or icon), or a briefcase + "Lance" fallback when no branding is set.
 */
export function AppLogo({ full = true, className, height, alt = 'Lance' }: AppLogoProps) {
  const { data: branding } = useBranding();
  const url = full ? branding?.logo_url : branding?.icon_url;
  const h = height ?? 32;

  if (url) {
    return (
      <img
        src={url}
        alt={alt}
        className={cn('object-contain object-left', className)}
        style={{ height: h, width: 'auto' }}
      />
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Briefcase className="h-6 w-6 text-primary shrink-0" />
      <span className="text-xl font-bold">Lance</span>
    </div>
  );
}
