import BlurFade from "@/components/landing/magicui/blur-fade";
import Section from "@/components/landing/section";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Shield, Zap } from "lucide-react";

const problems = [
  {
    title: "Too many tabs and subscriptions, not enough time",
    description:
      "Spreadsheets for projects, one app for time, another for invoices… and somehow you’re still not sure what’s due, when, or for who.",
    icon: Brain,
  },
  {
    title: "Guessing your hours",
    description:
      "Reconstructing your week from memory is stressful and usually wrong. You either under‑bill or over‑bill.",
    icon: Zap,
  },
  {
    title: "Chasing payments",
    description:
      "Sending invoices, remembering who’s late, and writing “just bumping this to the top of your inbox” for the 4th time drains your energy and your calendar.",
    icon: Shield,
  },
];

export default function Problem() {
  return (
    <Section
      title="Problem"
      subtitle="Freelance admin shouldn’t be your full‑time job."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        {problems.map((problem, index) => (
          <BlurFade key={index} delay={0.2 + index * 0.2} inView>
            <Card className="bg-background border-none shadow-none h-full">
              <CardContent className="p-6 space-y-4 h-full flex flex-col">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <problem.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{problem.title}</h3>
                <p className="text-muted-foreground flex-1">
                  {problem.description}
                </p>
              </CardContent>
            </Card>
          </BlurFade>
        ))}
      </div>
    </Section>
  );
}

