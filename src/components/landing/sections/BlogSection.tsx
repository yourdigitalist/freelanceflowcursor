import Section from "@/components/landing/section";

const articles = [
  {
    slug: "introducing-acme-ai",
    title: "Introducing Acme AI: The Future of Business Automation",
    publishedAt: "2024-03-01",
    summary:
      "We're excited to announce the launch of Acme AI, our revolutionary platform that helps businesses automate their workflows with cutting-edge artificial intelligence.",
    image: "/dashboard.png",
    author: {
      name: "Acme Team",
      avatar: "https://randomuser.me/api/portraits/men/91.jpg",
    },
  },
  {
    slug: "ai-powered-analytics",
    title: "How AI-Powered Analytics is Changing the Game",
    publishedAt: "2024-02-15",
    summary:
      "Discover how companies are leveraging AI analytics to gain competitive advantages, reduce costs, and make smarter, data-driven decisions faster.",
    image: "/dashboard.png",
    author: {
      name: "Sarah Johnson",
      avatar: "https://randomuser.me/api/portraits/women/12.jpg",
    },
  },
  {
    slug: "future-of-automation",
    title: "The Future of Workflow Automation in 2024",
    publishedAt: "2024-02-01",
    summary:
      "Explore the latest trends in workflow automation and how AI is transforming the way businesses operate in an increasingly digital world.",
    image: "/dashboard.png",
    author: {
      name: "Michael Chen",
      avatar: "https://randomuser.me/api/portraits/men/45.jpg",
    },
  },
];

export default function BlogSection() {
  return (
    <Section title="Blog" subtitle="Latest Articles">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articles.map((data) => (
          <a
            key={data.slug}
            href={`/blog/${data.slug}`}
            className="group flex flex-col overflow-hidden rounded-xl border border-border bg-background transition-all hover:shadow-md"
          >
            <div className="overflow-hidden">
              <img
                src={data.image}
                alt={data.title}
                className="h-48 w-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col gap-3 p-5">
              <p className="text-xs text-muted-foreground">
                {new Date(data.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {data.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {data.summary}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <img
                  src={data.author.avatar}
                  alt={data.author.name}
                  className="h-7 w-7 rounded-full"
                />
                <span className="text-xs text-muted-foreground">
                  {data.author.name}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </Section>
  );
}

