import { useState, useEffect } from 'react';
import { Briefcase } from '@/components/icons';
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

function LogoPlaceholder({ className, height, full }: { className?: string; height: number; full: boolean }) {
  return (
    <div
      className={cn('animate-pulse bg-muted/50 rounded', className)}
      style={{ height, minWidth: full ? 100 : height }}
    />
  );
}

/**
 * Shows the app logo from admin branding (full logo or icon), or a briefcase + "Lance" fallback when no branding is set.
 * While branding or the logo image is loading, shows a placeholder so the luggage icon never flashes before the logo.
 * If the logo image fails to load (404, CORS, etc.), falls back to Briefcase + "Lance".
 */
export function AppLogo({ full = true, className, height, alt = 'Lance' }: AppLogoProps) {
  const { data: branding, isPending } = useBranding();
  const url = full ? branding?.logo_url : branding?.icon_url;
  const h = height ?? 32;
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  // Reset load state when URL changes so we retry the new URL
  useEffect(() => {
    setImgLoaded(false);
    setImgFailed(false);
  }, [url]);

  if (isPending) {
    return <LogoPlaceholder className={className} height={h} full={full} />;
  }

  // Show fallback if we have a URL but the image failed to load (404, CORS, etc.)
  if (url && !imgFailed) {
    return (
      <div
        className="relative inline-block"
        style={{ height: h, minWidth: !imgLoaded ? (full ? 100 : h) : undefined }}
      >
        {!imgLoaded && <LogoPlaceholder className={className} height={h} full={full} />}
        <img
          src={url}
          alt={alt}
          className={cn('object-contain object-left', className, !imgLoaded && 'absolute inset-0 opacity-0')}
          style={{ height: h, width: 'auto' }}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Briefcase className="h-6 w-6 text-primary shrink-0" />
      <span className="text-xl font-bold">Lance</span>
    </div>
  );
}
