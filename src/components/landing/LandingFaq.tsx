import Section from './Section';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { LandingContent } from '@/lib/landingContent';

export default function LandingFaq({ content }: { content: LandingContent['faq'] }) {
  return (
    <Section title={content.title} subtitle={content.subtitle || undefined}>
      <div className="mx-auto my-12 md:max-w-[800px]">
        <Accordion type="single" collapsible className="flex w-full flex-col items-center justify-center space-y-2">
          {content.items.map((faq, idx) => (
            <AccordionItem key={idx} value={faq.question} className="w-full border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4">{faq.question}</AccordionTrigger>
              <AccordionContent className="px-4">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      {content.contactPrompt && content.contactEmail ? (
        <h4 className="mb-12 text-center text-sm font-medium text-foreground/80">
          {content.contactPrompt} <a href={`mailto:${content.contactEmail}`} className="underline">{content.contactEmail}</a>
        </h4>
      ) : null}
    </Section>
  );
}
