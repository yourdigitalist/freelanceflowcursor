import FeaturesVertical from "@/components/landing/features-vertical";
import Section from "@/components/landing/Section";
import { useLandingContent } from "@/hooks/useLandingContent";
import { Sparkles, Upload, Zap } from "lucide-react";

const makeData = (image: string) => [
  {
    id: 1,
    title: "1. Set up your workspace",
    content:
      "Add your clients, projects, and rates. It takes a few minutes and immediately replaces a messy stack of docs and spreadsheets.",
    image,
    icon: <Upload className="w-6 h-6 text-primary" />,
  },
  {
    id: 2,
    title: "2. Track the work you’re already doing",
    content:
      "Start the timer when you begin, stop when you’re done. Lance organizes your time by client and project automatically.",
    image,
    icon: <Zap className="w-6 h-6 text-primary" />,
  },
  {
    id: 3,
    title: "3. Send invoices and get paid",
    content:
      "Turn tracked time into invoices in a couple of clicks. Share a clear breakdown, send reminders, and keep cash flow moving without awkward follow‑ups.",
    image,
    icon: <Sparkles className="w-6 h-6 text-primary" />,
  },
];

export default function HowItWorks() {
  const { data: content } = useLandingContent();
  const how = content?.howItWorks;
  const screenshot = content?.hero.imageUrl || "/dashboard.png";
  const data = makeData(screenshot);

  return (
    <Section
      title={how?.title || "How it works"}
      subtitle={
        how?.subtitle ||
        "Just 3 simple steps to get your freelance business under control"
      }
    >
      <FeaturesVertical data={data} />
    </Section>
  );
}

