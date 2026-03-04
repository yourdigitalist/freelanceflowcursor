import Marquee from './Marquee';
import type { LandingContent } from '@/lib/landingContent';

export default function LandingLogos({ content }: { content: LandingContent['logos'] }) {
  if (!content.heading && (!content.imageUrls || content.imageUrls.length === 0)) return null;
  return (
    <section id="logos">
      <div className="container mx-auto px-4 py-12 md:px-8">
        {content.heading && <h3 className="text-center text-sm font-semibold text-muted-foreground">{content.heading}</h3>}
        {content.imageUrls && content.imageUrls.length > 0 && (
          <div className="relative mt-6">
            <Marquee className="max-w-full [--duration:40s]">
              {content.imageUrls.map((url, idx) => (
                <img key={idx} src={url} alt="" className="h-10 w-28 object-contain grayscale opacity-70 dark:brightness-0 dark:invert" />
              ))}
            </Marquee>
            <div className="pointer-events-none absolute inset-y-0 left-0 h-full w-1/3 bg-gradient-to-r from-background" />
            <div className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/3 bg-gradient-to-l from-background" />
          </div>
        )}
      </div>
    </section>
  );
}
