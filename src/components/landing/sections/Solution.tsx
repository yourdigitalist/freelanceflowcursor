"use client";

import Section from "@/components/landing/Section";
import { cn } from "@/lib/utils";
import { useLandingContent } from "@/hooks/useLandingContent";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";

const BOX_CLASSES = [
  "hover:bg-red-500/10 transition-all duration-500 ease-out",
  "order-3 xl:order-none hover:bg-blue-500/10 transition-all duration-500 ease-out",
  "md:row-span-2 hover:bg-orange-500/10 transition-all duration-500 ease-out",
  "flex-row order-4 md:col-span-2 md:flex-row xl:order-none hover:bg-green-500/10 transition-all duration-500 ease-out",
];

const DEFAULT_BOXES = [
  {
    heading: "A home for every client",
    text: "Keep projects, notes, files, and timelines in one place. See what's active, what's waiting on the client, and what's done at a glance.",
    imageUrl: "",
  },
  {
    heading: "Time tracking, accurately",
    text: "Start a timer once and forget about it. Switch between tasks without losing your place, and turn tracked time into billable hours in a click.",
    imageUrl: "",
  },
  {
    heading: "Invoicing on autopilot",
    text: "Generate clean, professional invoices from your time logs and project fees. Know exactly who's paid, who's late, and what's coming up.",
    imageUrl: "",
  },
  {
    heading: "Delight clients with clarity",
    text: "Share clear summaries of hours, deliverables, and status so clients always know what they're paying for, and keep coming back.",
    imageUrl: "",
  },
];

export default function Solution() {
  const { data: content } = useLandingContent();
  const solution = content?.solution;
  const title = solution?.title ?? "Solution";
  const subtitle =
    solution?.subtitle ?? "Lance takes care of the \"business\" in your business.";
  const description =
    solution?.description ??
    "One light, friendly workspace where projects, time tracking, and invoicing all play nicely together, so you can focus on the work you're actually hired for.";
  const boxes = solution?.boxes?.length ? solution.boxes : DEFAULT_BOXES;
  const ctaButtonText = solution?.ctaButtonText ?? "Get started for free";

  return (
    <Section
      title={title}
      subtitle={subtitle}
      description={description}
      className="bg-neutral-100 dark:bg-neutral-900"
    >
      <div className="mx-auto mt-16 grid max-w-sm grid-cols-1 gap-6 text-gray-500 md:max-w-3xl md:grid-cols-2 xl:grid-rows-2 md:grid-rows-3 xl:max-w-6xl xl:auto-rows-fr xl:grid-cols-3">
        {boxes.map((box, index) => (
          <motion.div
            key={index}
            className={cn(
              "group relative items-start overflow-hidden bg-neutral-50 dark:bg-neutral-800 p-6 rounded-2xl",
              BOX_CLASSES[index] ?? "",
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
              <h3 className="font-semibold mb-2 text-primary">{box.heading}</h3>
              <p className="text-foreground">{box.text}</p>
            </div>
            {box.imageUrl ? (
              <div className="mt-4 w-full overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
                <img
                  src={box.imageUrl}
                  alt=""
                  className="max-h-64 w-full object-cover object-top"
                />
              </div>
            ) : null}
            <div className="absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-neutral-50 dark:from-neutral-800 to-transparent pointer-events-none" />
          </motion.div>
        ))}
      </div>
      <div className="mt-12 flex justify-center">
        <Link
          to="/auth"
          className={cn(buttonVariants({ size: "lg" }), "text-background")}
        >
          {ctaButtonText}
        </Link>
      </div>
    </Section>
  );
}
