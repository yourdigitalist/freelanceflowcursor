import { Link } from 'react-router-dom';
import Section from './Section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from '@/components/icons';
import type { LandingContent } from '@/lib/landingContent';

export default function LandingPricing({ content }: { content: LandingContent['pricing'] }) {
  return (
    <Section title={content.title} subtitle={content.subtitle || undefined}>
      <div className="max-w-md mx-auto mt-10">
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-2xl">{content.planName}</CardTitle>
            <div className="pt-4">
              <span className="text-4xl font-bold">{content.priceMonthly}</span>
              <span className="text-muted-foreground"> / month</span>
            </div>
            <p className="text-muted-foreground text-sm">or</p>
            <p className="text-lg font-semibold">
              {content.priceYearly}
              <span className="text-sm font-normal text-muted-foreground"> {content.yearlyNote}</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium text-foreground">{content.trialNote}</p>
            <p className="text-sm font-semibold">Includes:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {content.features.map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            {content.note ? <p className="pt-2 text-xs text-muted-foreground">{content.note}</p> : null}
            <Button size="lg" asChild className="w-full rounded-full mt-4">
              <Link to="/auth">{content.cta}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
