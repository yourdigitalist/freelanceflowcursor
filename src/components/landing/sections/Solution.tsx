"use client";

import FlickeringGrid from "@/components/landing/magicui/flickering-grid";
import Ripple from "@/components/landing/magicui/ripple";
import Safari from "@/components/landing/safari";
import Section from "@/components/landing/section";
import { cn } from "@/lib/utils";
import { useLandingContent } from "@/hooks/useLandingContent";
import { motion } from "framer-motion";

const baseFeatures = [
  {
    title: "A home for every client",
    description:
      "Keep projects, notes, files, and timelines in one place. See what’s active, what’s waiting on the client, and what’s done at a glance.",
    className: "hover:bg-red-500/10 transition-all duration-500 ease-out",
    content: (
      <Safari
        src={`/dashboard.png`}
        url="https://acme.ai"
        className="-mb-32 mt-4 max-h-64 w-full px-4 select-none drop-shadow-[0_0_28px_rgba(0,0,0,.1)] group-hover:translate-y-[-10px] transition-all duration-300"
      />
    ),
  },
  {
    title: "Time tracking, accurately",
    description:
      "Start a timer once and forget about it. Switch between tasks without losing your place, and turn tracked time into billable hours in a click.",
    className:
      "order-3 xl:order-none hover:bg-blue-500/10 transition-all duration-500 ease-out",
    content: (
      <Safari
        src={`/dashboard.png`}
        url="https://acme.ai"
        className="-mb-32 mt-4 max-h-64 w-full px-4 select-none drop-shadow-[0_0_28px_rgba(0,0,0,.1)] group-hover:translate-y-[-10px] transition-all duration-300"
      />
    ),
  },
  {
    title: "Invoicing on autopilot",
    description:
      "Generate clean, professional invoices from your time logs and project fees. Know exactly who’s paid, who’s late, and what’s coming up.",
    className:
      "md:row-span-2 hover:bg-orange-500/10 transition-all duration-500 ease-out",
    content: (
      <>
        <FlickeringGrid
          className="z-0 absolute inset-0 [mask:radial-gradient(circle_at_center,#fff_400px,transparent_0)]"
          squareSize={4}
          gridGap={6}
          color="#000"
          maxOpacity={0.1}
          flickerChance={0.1}
          height={800}
          width={800}
        />
        <Safari
          src={`/dashboard.png`}
          url="https://acme.ai"
          className="-mb-48 ml-12 mt-16 h-full px-4 select-none drop-shadow-[0_0_28px_rgba(0,0,0,.1)] group-hover:translate-x-[-10px] transition-all duration-300"
        />
      </>
    ),
  },
  {
    title: "Delight clients with clarity",
    description:
      "Share clear summaries of hours, deliverables, and status so clients always know what they’re paying for, and keep coming back.",
    className:
      "flex-row order-4 md:col-span-2 md:flex-row xl:order-none hover:bg-green-500/10 transition-all duration-500 ease-out",
    content: (
      <>
        <Ripple className="absolute -bottom-full" />
        <Safari
          src={`/dashboard.png`}
          url="https://acme.ai"
          className="-mb-32 mt-4 max-h-64 w-full px-4 select-none drop-shadow-[0_0_28px_rgba(0,0,0,.1)] group-hover:translate-y-[-10px] transition-all duration-300"
        />
      </>
    ),
  },
];

export default function Solution() {
  const { data: content } = useLandingContent();
  const solution = content?.solution;
  const screenshot = content?.hero.imageUrl || "/dashboard.png";

  const features = baseFeatures.map((f) => {
    if (!("content" in f)) return f;
    return {
      ...f,
      content:
        "props" in (f.content as any) && (f.content as any).type === Safari
          ? {
              ...f.content,
              props: { ...(f.content as any).props, src: screenshot },
            }
          : f.content,
    };
  });

  return (
    <Section
      title="Solution"
      subtitle={
        solution?.subtitle ||
        "Lance takes care of the “business” in your business."
      }
      description={
        solution?.description ||
        "One light, friendly workspace where projects, time tracking, and invoicing all play nicely together, so you can focus on the work you’re actually hired for."
      }
      className="bg-neutral-100 dark:bg-neutral-900"
    >
      <div className="mx-auto mt-16 grid max-w-sm grid-cols-1 gap-6 text-gray-500 md:max-w-3xl md:grid-cols-2 xl:grid-rows-2 md:grid-rows-3 xl:max-w-6xl xl:auto-rows-fr xl:grid-cols-3">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            className={cn(
              "group relative items-start overflow-hidden bg-neutral-50 dark:bg-neutral-800 p-6 rounded-2xl",
              feature.className,
            )}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              type: "spring",
              stiffness: 100,
              damping: 30,
              delay: index * 0.1,
            }}
            viewport={{ once: true }}
          >
            <div>
              <h3 className="font-semibold mb-2 text-primary">
                {feature.title}
              </h3>
              <p className="text-foreground">{feature.description}</p>
            </div>
            {feature.content}
            <div className="absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-neutral-50 dark:from-neutral-900 pointer-events-none"></div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

