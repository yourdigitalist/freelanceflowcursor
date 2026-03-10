import type { ComponentType } from "react";
import BlurFade from "@/components/landing/magicui/blur-fade";
import Section from "@/components/landing/Section";
import { Card, CardContent } from "@/components/ui/card";
import { useLandingContent } from "@/hooks/useLandingContent";
import { getAppIconPublicUrl } from "@/lib/appIcons";
import { Brain, Shield, Zap } from "lucide-react";

const LEGACY_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  brain: Brain,
  zap: Zap,
  shield: Shield,
};

const DEFAULT_BOXES = [
  {
    icon: "brain" as const,
    heading: "Too many tabs and subscriptions, not enough time",
    text:
      "Spreadsheets for projects, one app for time, another for invoices… and somehow you're still not sure what's due, when, or for who.",
  },
  {
    icon: "zap" as const,
    heading: "Guessing your hours",
    text:
      "Reconstructing your week from memory is stressful and usually wrong. You either under‑bill or over‑bill.",
  },
  {
    icon: "shield" as const,
    heading: "Chasing payments",
    text:
      'Sending invoices, remembering who\'s late, and writing "just bumping this to the top of your inbox" for the 4th time drains your energy and your calendar.',
  },
];

export default function Problem() {
  const { data: content } = useLandingContent();
  const problem = content?.problem;
  const title = problem?.title ?? "Problem";
  const subtitle = problem?.subtitle ?? "Freelance admin shouldn't be your full‑time job.";
  const boxes = problem?.boxes?.length ? problem.boxes : DEFAULT_BOXES;

  return (
    <Section title={title} subtitle={subtitle}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        {boxes.map((box, index) => {
          const isStoragePath = box.icon && (box.icon.includes("/") || box.icon.toLowerCase().endsWith(".svg"));
          const iconUrl = isStoragePath ? getAppIconPublicUrl(box.icon) : "";
          const LegacyIcon = !isStoragePath && box.icon ? LEGACY_ICON_MAP[box.icon] : null;
          return (
            <BlurFade key={index} delay={0.2 + index * 0.2} inView>
              <Card className="bg-background border-none shadow-none h-full">
                <CardContent className="p-6 space-y-4 h-full flex flex-col">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    {iconUrl ? (
                      <img src={iconUrl} alt="" className="w-6 h-6 object-contain" />
                    ) : LegacyIcon ? (
                      <LegacyIcon className="w-6 h-6 text-primary" />
                    ) : null}
                  </div>
                  <h3 className="text-xl font-semibold">{box.heading}</h3>
                  <p className="text-muted-foreground flex-1">{box.text}</p>
                </CardContent>
              </Card>
            </BlurFade>
          );
        })}
      </div>
    </Section>
  );
}
