import Section from '@/components/landing/Section';
import type { LandingContent } from '@/lib/landingContent';
import { Check } from '@/components/icons';
import { ListTodo, Clock, MessageSquare, Receipt } from '@/components/icons';

const stepIcons = [ListTodo, Clock, MessageSquare, Receipt];

interface LandingHowItWorksProps {
  content: LandingContent['howItWorks'];
}

export default function LandingHowItWorks({ content }: LandingHowItWorksProps) {
  return (
    <Section id="how-it-works" title={content.title} subtitle={content.subtitle} className="scroll-mt-20">
      <div className="grid gap-12 lg:gap-16 max-w-4xl mx-auto mt-12">
        {content.steps.map((item, i) => {
          const Icon = stepIcons[i];
          return (
            <div key={i} className="flex gap-6 items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                {item.step}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold">
                  {Icon && <Icon className="h-5 w-5 text-primary" />}
                  {item.title}
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  {item.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
      {content.footer && (
        <p className="mt-12 text-center font-medium text-foreground">{content.footer}</p>
      )}
    </Section>
  );
}
