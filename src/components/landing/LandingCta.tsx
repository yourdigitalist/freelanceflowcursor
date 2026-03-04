import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { LandingContent } from '@/lib/landingContent';
import { ArrowRight } from '@/components/icons';

export default function LandingCta({ content }: { content: LandingContent['cta'] }) {
  return (
    <section id="cta" className="bg-primary/10 rounded-xl py-16">
      <div className="container mx-auto max-w-2xl px-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">{content.title}</h2>
        <p className="mt-6 text-lg text-muted-foreground">{content.subtext}</p>
        <Button size="lg" asChild className="mt-8 rounded-full">
          <Link to="/auth">
            {content.buttonText} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
