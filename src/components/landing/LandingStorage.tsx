import type { LandingContent } from '@/lib/landingContent';
import { HardDrive } from '@/components/icons';

export default function LandingStorage({ content }: { content: LandingContent['storage'] }) {
  return (
    <section className="bg-muted/30 py-16 lg:py-20">
      <div className="container mx-auto max-w-2xl px-4">
        <h2 className="flex items-center justify-center gap-2 text-center text-2xl font-bold">
          <HardDrive className="h-6 w-6 text-primary" />
          {content.title}
        </h2>
        {content.paragraphs.map((p, i) => (
          <p key={i} className="mt-4 text-center text-muted-foreground">{p}</p>
        ))}
        <p className="mt-4 text-center font-medium text-foreground">{content.closing}</p>
      </div>
    </section>
  );
}
