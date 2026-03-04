import { Link } from 'react-router-dom';
import { AppLogo } from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LandingContent } from '@/lib/landingContent';
import { useEffect, useState } from 'react';

interface LandingHeaderProps {
  content: LandingContent['header'];
}

export default function LandingHeader({ content }: LandingHeaderProps) {
  const [addBorder, setAddBorder] = useState(false);

  useEffect(() => {
    const handleScroll = () => setAddBorder(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 py-2 bg-background/80 backdrop-blur border-b border-border/40">
      <div className="flex justify-between items-center container mx-auto px-4">
        <Link to="/" className="relative mr-6 flex items-center gap-2" title="Home">
          <AppLogo full height={40} />
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="rounded-full">
            <Link to="/auth">{content.ctaLogin}</Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link to="/auth">{content.ctaTrial}</Link>
          </Button>
        </div>
      </div>
      <hr
        className={cn(
          'absolute w-full bottom-0 transition-opacity duration-300 ease-in-out',
          addBorder ? 'opacity-100' : 'opacity-0'
        )}
      />
    </header>
  );
}
