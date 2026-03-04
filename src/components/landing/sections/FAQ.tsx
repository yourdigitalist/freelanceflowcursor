import Section from "@/components/landing/Section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLandingContent } from "@/hooks/useLandingContent";

export default function FAQ() {
  const { data: content } = useLandingContent();
  const faq = content?.faq;

  return (
    <Section
      title={faq?.title || "FAQ"}
      subtitle={faq?.subtitle || "Frequently asked questions"}
    >
      <div className="mx-auto my-12 md:max-w-[800px]">
        <Accordion
          type="single"
          collapsible
          className="flex w-full flex-col items-center justify-center space-y-2"
        >
          {(faq?.items || []).map((item, idx) => (
            <AccordionItem
              key={idx}
              value={item.question}
              className="w-full border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="px-4">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      {faq?.contactPrompt && faq?.contactEmail && (
        <h4 className="mb-12 text-center text-sm font-medium tracking-tight text-foreground/80">
          {faq.contactPrompt}{" "}
          <a href={`mailto:${faq.contactEmail}`} className="underline">
            {faq.contactEmail}
          </a>
        </h4>
      )}
    </Section>
  );
}

