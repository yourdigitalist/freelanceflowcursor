import { Post } from "@/lib/blog";

export default function BlogCard({
  data,
  priority,
}: {
  data: Post;
  priority?: boolean;
}) {
  return (
    <a href={`/blog/${data.slug}`} className="block">
      <div className="bg-background rounded-lg p-4 mb-4 border hover:shadow-sm transition-shadow duration-200">
        {data.image && (
          <img
            className="rounded-t-lg object-cover border"
            src={data.image}
            width={1200}
            height={630}
            alt={data.title}
          />
        )}
        {!data.image && <div className="bg-gray-200 h-[180px] mb-4 rounded" />}
        <h3 className="text-xl font-semibold mb-2">{data.title}</h3>
        <p className="text-foreground mb-4">{data.summary}</p>
      </div>
    </a>
  );
}
