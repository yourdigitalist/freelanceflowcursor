import FeaturesHorizontal from "@/components/landing/features-horizontal";
import Section from "@/components/landing/Section";
import { useLandingContent } from "@/hooks/useLandingContent";
import { Clock, FileText, FolderKanban, MessageSquare } from "lucide-react";

export default function Features() {
  const { data: content } = useLandingContent();
  const features = content?.features;
  const screenshot = content?.hero.imageUrl || "/dashboard.png";

  const data =
    features?.items?.length
      ? features.items.map((item, idx) => {
          const iconMap = [
            <FolderKanban className="h-6 w-6 text-primary" />,
            <FileText className="h-6 w-6 text-primary" />,
            <Clock className="h-6 w-6 text-primary" />,
            <MessageSquare className="h-6 w-6 text-primary" />,
          ] as const;
          const icon = iconMap[idx] ?? (
            <FolderKanban className="h-6 w-6 text-primary" />
          );
          return {
            id: idx + 1,
            title: item.title,
            content: item.content,
            image: item.imageUrl || screenshot,
            icon,
          };
        })
      : [
          {
            id: 1,
            title: "Projects",
            content:
              "Organize every client, project, and deliverable with clear statuses and due dates, all in one simple view.",
            image: screenshot,
            icon: <FolderKanban className="h-6 w-6 text-primary" />,
          },
          {
            id: 2,
            title: "Invoices",
            content:
              "Create clean, branded invoices from your projects and time logs, and see what’s paid or overdue at a glance.",
            image: screenshot,
            icon: <FileText className="h-6 w-6 text-primary" />,
          },
          {
            id: 3,
            title: "Time tracking",
            content:
              "Track billable and non‑billable hours without friction, right where you already manage the work.",
            image: screenshot,
            icon: <Clock className="h-6 w-6 text-primary" />,
          },
          {
            id: 4,
            title: "Client feedback",
            content:
              "Keep feedback, approvals, and requests next to the work instead of buried in email threads and chat history.",
            image: screenshot,
            icon: <MessageSquare className="h-6 w-6 text-primary" />,
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

