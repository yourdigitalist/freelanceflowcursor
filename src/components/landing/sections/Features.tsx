import FeaturesHorizontal from "@/components/landing/features-horizontal";
import Section from "@/components/landing/Section";
import { useLandingContent } from "@/hooks/useLandingContent";

const FEATURE_EMOJIS = ["🗂", "⏱", "✅", "🧾", "📋", "📝"] as const;

function featureIcon(idx: number) {
  return (
    <span className="text-2xl leading-none" aria-hidden>
      {FEATURE_EMOJIS[idx] ?? FEATURE_EMOJIS[0]}
    </span>
  );
}

export default function Features() {
  const { data: content } = useLandingContent();
  const features = content?.features;
  const screenshot = content?.hero.imageUrl || "/dashboard.png";

  const data =
    features?.items?.length
      ? features.items.map((item, idx) => ({
          id: idx + 1,
          title: item.title,
          content: item.content,
          image: item.imageUrl || screenshot,
          icon: featureIcon(idx),
        }))
      : [
          {
            id: 1,
            title: "Clients & Projects",
            content:
              "Manage your full client pipeline in one place — from new lead to active project. Track contacts, set follow-ups, and log activity without digging through email threads.",
            image: screenshot,
            icon: featureIcon(0),
          },
          {
            id: 2,
            title: "Time Tracking",
            content:
              "Log billable hours with one click. Lance tracks time against projects and feeds it straight into your invoices.",
            image: screenshot,
            icon: featureIcon(1),
          },
          {
            id: 3,
            title: "Client Approvals",
            content:
              'Share a link. Your client clicks, comments, approves — no account, no app, no "did you get my email?" Pin feedback directly on your files.',
            image: screenshot,
            icon: featureIcon(2),
          },
          {
            id: 4,
            title: "Invoicing",
            content:
              "Turn completed work into a polished invoice in seconds. Track payments and send reminders automatically.",
            image: screenshot,
            icon: featureIcon(3),
          },
          {
            id: 5,
            title: "Task Management",
            content:
              "A kanban board built for service teams. Priorities, due dates, statuses — exactly what you need, nothing more.",
            image: screenshot,
            icon: featureIcon(4),
          },
          {
            id: 6,
            title: "Notes",
            content:
              "A rich text workspace for briefs, meeting notes, and ideas. Link notes to clients and projects, and turn highlighted text into tasks in one click.",
            image: screenshot,
            icon: featureIcon(5),
          },
        ];

  return (
    <Section
      title={features?.title || "Features"}
      subtitle={features?.subtitle || "Everything you need to run client work"}
    >
      <FeaturesHorizontal
        collapseDelay={5000}
        linePosition="bottom"
        data={data}
      />
    </Section>
  );
}

