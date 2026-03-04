import BlurFade from './BlurFade';
import Section from './Section';
import { Card, CardContent } from '@/components/ui/card';
import type { LandingContent } from '@/lib/landingContent';
import { Brain, Shield, Zap } from 'lucide-react';

const icons = [Brain, Zap, Shield];

interface LandingProblemProps {
  content: LandingContent['problem'];
}

export default function LandingProblem({ content }: LandingProblemProps) {
  const items = content.bullets.slice(0, 3).map((description, i) => ({
    title: description.split('.')[0] || description,
    description,
    icon: icons[i] || Brain,
  }));
  return (
    <Section title="Problem" subtitle="If this feels familiar, this tool is for you.">
      <div className="grid grid-cols-1 gap-8 mt-12 md:grid-cols-3">
        {items.map((item, index) => (
          <BlurFade key={index} delay={0.2 + index * 0.2} inView>
            <Card className="bg-card border-border shadow-none">
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          </BlurFade>
        ))}
      </div>
      {content.closing && (
        <p className="mt-8 text-center text-lg font-medium text-primary">{content.closing}</p>
      )}
    </Section>
  );
}
