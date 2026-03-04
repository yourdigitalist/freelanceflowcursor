"use client";

import { motion } from "framer-motion";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLandingContent } from "@/hooks/useLandingContent";
import { Link } from "react-router-dom";

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

function HeroPill() {
  return (
    <motion.a
      href="/blog/introducing-acme-ai"
      className="flex w-auto items-center space-x-2 rounded-full bg-primary px-2 py-1 ring-1 ring-primary whitespace-pre text-primary-foreground"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease }}
    >
      <div className="w-fit rounded-full bg-primary-foreground px-2 py-0.5 text-center text-xs font-medium text-primary sm:text-sm">
        📣 New in Lance
      </div>
      <p className="text-xs font-medium sm:text-sm">
        Freelancers finally get an HQ
      </p>
      <svg
        width="12"
        height="12"
        className="ml-1"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8.78141 5.33312L5.20541 1.75712L6.14808 0.814453L11.3334 5.99979L6.14808 11.1851L5.20541 10.2425L8.78141 6.66645H0.666748V5.33312H8.78141Z"
          fill="hsl(var(--primary))"
        />
      </svg>
    </motion.a>
  );
}

function HeroTitles({
  headline,
  subtext,
}: {
  headline: string;
  subtext: string;
}) {
  return (
    <div className="flex w-full max-w-2xl flex-col space-y-4 overflow-hidden pt-8">
      <motion.h1
        className="text-center text-4xl font-medium leading-tight text-foreground sm:text-5xl md:text-6xl"
        initial={{ filter: "blur(10px)", opacity: 0, y: 50 }}
        animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
        transition={{
          duration: 1,
          ease,
          staggerChildren: 0.2,
        }}
      >
        <motion.span
          className="inline-block px-1 md:px-2 text-balance font-semibold"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 0,
            ease,
          }}
        >
          {headline}
        </motion.span>
      </motion.h1>
      <motion.p
        className="mx-auto max-w-xl text-center text-lg leading-6 text-muted-foreground sm:text-xl sm:leading-8 text-balance"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.6,
          duration: 0.8,
          ease,
        }}
      >
        {subtext}
      </motion.p>
    </div>
  );
}

function HeroCTA({
  ctaText,
  trialNote,
}: {
  ctaText: string;
  trialNote: string;
}) {
  return (
    <>
      <motion.div
        className="mx-auto mt-6 flex w-full max-w-2xl flex-col items-center justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8, ease }}
      >
        <Link
          to="/auth"
          className={cn(
            buttonVariants({ variant: "default" }),
            "w-full sm:w-auto text-background",
          )}
        >
          {ctaText}
        </Link>
      </motion.div>
      <motion.p
        className="mt-5 text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.8 }}
      >
        {trialNote}
      </motion.p>
    </>
  );
}

function HeroImage({ imageUrl }: { imageUrl?: string }) {
  return (
    <motion.div
      className="relative mx-auto flex w-full items-center justify-center"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 1, ease }}
    >
      <div className="border rounded-lg shadow-lg max-w-screen-lg mt-16 overflow-hidden w-full">
        <img
          src={imageUrl || "/dashboard.png"}
          alt="Hero Dashboard"
          className="w-full h-auto"
        />
      </div>
    </motion.div>
  );
}

export default function Hero() {
  const { data: content } = useLandingContent();
  const hero = content?.hero;

  const headline =
    hero?.headline || "Run your freelance business in one place";
  const subtext =
    hero?.subtext ||
    "Track time, manage projects, and get paid – without juggling twelve different tools.";
  const ctaText = hero?.ctaTrial || "Get started for free";
  const trialNote = hero?.trialNote || "15‑day free trial.";
  const imageUrl = hero?.imageUrl || "/dashboard.png";

  return (
    <section id="hero">
      <div className="relative flex w-full flex-col items-center justify-start px-4 pt-32 sm:px-6 sm:pt-24 md:pt-32 lg:px-8">
        <HeroPill />
        <HeroTitles headline={headline} subtext={subtext} />
        <HeroCTA ctaText={ctaText} trialNote={trialNote} />
        <HeroImage imageUrl={imageUrl} />
        <div className="pointer-events-none absolute inset-x-0 -bottom-12 h-1/3 bg-gradient-to-t from-white via-white to-transparent lg:h-1/4"></div>
      </div>
    </section>
  );
}

