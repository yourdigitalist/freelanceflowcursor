import Section from './Section';
import type { LandingContent } from '@/lib/landingContent';
import { Palette, Code2, Megaphone, Sparkles } from '@/components/icons';

const icons = [Palette, Code2, Megaphone, Sparkles];

export default function LandingFeatures({ content }: { content: LandingContent['features'] }) {
  return (
    <Section title={content.title} subtitle={content.subtitle}>
      <div className="mt-10 flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
        {content.items.map((item, i) => {
          const Icon = icons[i];
          return (
            <span
              key={i}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium"
            >
              {Icon && <Icon className="h-4 w-4 text-primary" />}
              {item.title}
            </span>
          );
        })}
      </div>
      <p className="mt-10 text-center text-muted-foreground">Not built for large teams or corporate workflows.</p>
    </Section>
  );
}
