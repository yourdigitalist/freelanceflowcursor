import Section from './Section';
import { Card, CardContent } from '@/components/ui/card';
import type { LandingContent } from '@/lib/landingContent';

export default function LandingTestimonials({ content }: { content: LandingContent['testimonials'] }) {
  return (
    <Section title={content.title} subtitle={content.subtitle} className="bg-muted/30 max-w-5xl">
      <div className="grid gap-8 mt-12 md:grid-cols-3">
        {content.items.map((t, i) => (
          <Card key={i} className="border-border bg-card shadow-sm">
            <CardContent className="pt-6">
              <p className="text-foreground">&ldquo;{t.quote}&rdquo;</p>
              {t.imageUrl ? <img src={t.imageUrl} alt={t.name} className="mt-4 h-10 w-10 rounded-full object-cover ring-1 ring-border" /> : null}
              <p className="mt-4 font-medium text-sm">{t.name}</p>
              <p className="text-sm text-muted-foreground">{t.role}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}
