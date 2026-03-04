"use client";

import Marquee from "@/components/landing/magicui/marquee";
import Section from "@/components/landing/Section";
import { cn } from "@/lib/utils";
import { useLandingContent } from "@/hooks/useLandingContent";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

export const Highlight = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <span
      className={cn(
        "bg-primary/20 p-1 py-0.5 font-bold text-primary dark:bg-primary/20 dark:text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
};

export interface TestimonialCardProps {
  name: string;
  role: string;
  img?: string;
  description: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export const TestimonialCard = ({
  description,
  name,
  img,
  role,
  className,
  ...props
}: TestimonialCardProps) => (
  <div
    className={cn(
      "mb-4 flex w-full cursor-pointer break-inside-avoid flex-col items-center justify-between gap-6 rounded-xl p-4",
      "border border-neutral-200 bg-white",
      "dark:bg-black dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
      className,
    )}
    {...props}
  >
    <div className="select-none text-sm font-normal text-neutral-700 dark:text-neutral-400">
      {description}
      <div className="flex flex-row py-1">
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
        <Star className="size-4 text-yellow-500 fill-yellow-500" />
      </div>
    </div>

    <div className="flex w-full select-none items-center justify-start gap-5">
      <img
        width={40}
        height={40}
        src={img || ""}
        alt={name}
        className="h-10 w-10 rounded-full ring-1 ring-border ring-offset-4"
      />

      <div>
        <p className="font-medium text-neutral-500">{name}</p>
        <p className="text-xs font-normal text-neutral-400">{role}</p>
      </div>
    </div>
  </div>
);

export default function Testimonials() {
  const { data: content } = useLandingContent();
  const testimonials = content?.testimonials.items || [];
  const cols = 4;
  const columns = Array.from({ length: cols }, () => [] as typeof testimonials);
  testimonials.forEach((t, idx) => {
    columns[idx % cols].push(t);
  });

  return (
    <Section
      title={content?.testimonials.title || "Testimonials"}
      subtitle={
        content?.testimonials.subtitle || "What our customers are saying"
      }
      className="max-w-8xl"
    >
      <div className="relative mt-6 max-h-screen overflow-hidden">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {columns.map((col, colIdx) => (
            <Marquee
              vertical
              key={colIdx}
              className={cn({
                "[--duration:60s]": colIdx === 1,
                "[--duration:30s]": colIdx === 2,
                "[--duration:70s]": colIdx === 3,
              })}
            >
              {col.map((t, idx) => (
                <motion.div
                  key={`${colIdx}-${idx}`}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: Math.random() * 0.8,
                    duration: 1.2,
                  }}
                >
                  <TestimonialCard
                    name={t.name}
                    role={t.role}
                    img={t.imageUrl}
                    description={<p>{t.quote}</p>}
                  />
                </motion.div>
              ))}
            </Marquee>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 w-full bg-gradient-to-t from-white from-20%"></div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 w-full bg-gradient-to-b from-white from-20%"></div>
      </div>
    </Section>
  );
}

