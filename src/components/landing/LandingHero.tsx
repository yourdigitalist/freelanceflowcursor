import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LandingContent } from '@/lib/landingContent';
import { ArrowRight } from '@/components/icons';

type HeroContent = LandingContent['hero'];
const ease = [0.16, 1, 0.3, 1];

export default function LandingHero({ content }: { content: HeroContent }) {
  return (
    <section id="hero" className="relative flex w-full flex-col items-center justify-start px-4 pt-24 sm:px-6 md:pt-32 lg:px-8">
      <div className="flex w-full max-w-2xl flex-col space-y-4 overflow-hidden pt-8 text-center">
        <motion.h1
          className="text-4xl font-medium leading-tight text-foreground sm:text-5xl md:text-6xl"
          initial={{ filter: 'blur(10px)', opacity: 0, y: 50 }}
          animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          transition={{ duration: 1, ease }}
        >
          {content.headline}
        </motion.h1>
        <motion.p
          className="mx-auto max-w-xl text-center text-lg leading-7 text-muted-foreground sm:text-xl sm:leading-9"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8, ease }}
        >
          {content.subtext}
        </motion.p>
        <motion.p
          className="mx-auto max-w-xl text-center text-lg leading-7 text-muted-foreground sm:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8, ease }}
        >
          {content.subtext2}
        </motion.p>
        {content.trialNote && (
          <motion.p className="text-sm font-medium text-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.8 }}>
            {content.trialNote}
          </motion.p>
        )}
      </div>
      <motion.div
        className="mx-auto mt-6 flex w-full max-w-2xl flex-col items-center justify-center gap-4 sm:flex-row sm:gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8, ease }}
      >
        <Button size="lg" asChild className={cn(buttonVariants({ variant: 'default' }), 'rounded-full gap-2')}>
          <Link to="/auth">{content.ctaTrial} <ArrowRight className="h-4 w-4" /></Link>
        </Button>
        <Button size="lg" variant="outline" asChild className="rounded-full">
          <Link to="/auth">{content.ctaLogin}</Link>
        </Button>
        <Button size="lg" variant="ghost" asChild className="rounded-full">
          <a href="#how-it-works">{content.ctaSecondary}</a>
        </Button>
      </motion.div>
      {content.imageUrl ? (
        <motion.div className="relative mx-auto mt-16 flex w-full items-center justify-center" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 1, ease }}>
          <img src={content.imageUrl} alt="" className="max-w-screen-lg rounded-lg border shadow-lg w-full object-cover" />
        </motion.div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 -bottom-12 h-1/3 bg-gradient-to-t from-background via-background to-transparent lg:h-1/4" />
    </section>
  );
}
