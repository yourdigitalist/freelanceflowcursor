import Section from './Section';
import type { LandingContent } from '@/lib/landingContent';
import { motion } from 'framer-motion';

interface LandingSolutionProps {
  content: LandingContent['solution'];
}

export default function LandingSolution({ content }: LandingSolutionProps) {
  return (
    <Section
      title={content.title}
      subtitle={content.subtitle}
      description={content.description}
      className="bg-muted/30"
    >
      <div className="mx-auto mt-16 grid max-w-sm grid-cols-1 gap-6 text-muted-foreground md:max-w-2xl md:grid-cols-2 xl:max-w-4xl">
        {content.items.map((item, index) => (
          <motion.div
            key={index}
            className="rounded-2xl border border-border bg-card p-6"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <span className="font-semibold text-primary">{item.label}</span>
            <span className="mx-1">→</span>
            <span className="font-semibold text-primary">{item.value}</span>
          </motion.div>
        ))}
      </div>
      {content.closing && (
        <p className="mt-8 text-center text-lg font-semibold">{content.closing}</p>
      )}
    </Section>
  );
}
