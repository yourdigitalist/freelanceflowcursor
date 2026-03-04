import type { LandingContent } from '@/lib/landingContent';
import { Check } from '@/components/icons';

export default function LandingTrial({ content }: { content: LandingContent['trial'] }) {
  return (
    <section className="py-16 lg:py-20">
      <div className="container mx-auto max-w-xl px-4 text-center">
        <h2 className="text-2xl font-bold">{content.title}</h2>
        <ul className="mt-6 space-y-3 text-muted-foreground">
          {content.bullets.map((text, i) => (
            <li key={i} className="flex items-center justify-center gap-2">
              <Check className="h-5 w-5 shrink-0 text-primary" />
              {text}
            </li>
          ))}
        </ul>
        <p className="mt-8 font-medium text-foreground">{content.closing}</p>
      </div>
    </section>
  );
}
