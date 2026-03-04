import BlurFade from "@/components/landing/magicui/blur-fade";
import Section from "@/components/landing/section";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { MdOutlineFormatQuote } from "react-icons/md";

const testimonialSlides = [
  {
    quote:
      "Before Lance I had timers, docs, and invoices scattered everywhere. Now I open one tab and instantly know who I’m working for, what’s due, and what I’m getting paid.",
    name: "Leslie Alexander",
    role: "Product Designer & Freelancer",
  },
  {
    quote:
      "I used to spend Sunday evenings cleaning up spreadsheets. Lance gave me my weekends back.",
    name: "Leslie Alexander",
    role: "Product Designer & Freelancer",
  },
  {
    quote:
      "The first month I used Lance I billed for 8 extra hours I would’ve forgotten about.",
    name: "Leslie Alexander",
    role: "Product Designer & Freelancer",
  },
];

export default function TestimonialsCarousel() {
  return (
    <Section
      title="Testimonial Highlight"
      subtitle="What our customers are saying"
    >
      <Carousel>
        <div className="max-w-2xl mx-auto relative">
          <CarouselContent className="bg-white rounded-3xl shadow-sm border border-border/40">
            {testimonialSlides.map((t, index) => (
              <CarouselItem key={index}>
                <div className="p-2 pb-5">
                  <div className="text-center">
                    <MdOutlineFormatQuote className="text-4xl text-muted-foreground my-4 mx-auto" />
                    <BlurFade delay={0.25} inView>
                      <h4 className="text-1xl font-semibold max-w-lg mx-auto px-10">
                        “{t.quote}”
                      </h4>
                    </BlurFade>
                    <div>
                      <BlurFade delay={0.25 * 3} inView>
                        <h4 className="text-1xl font-semibold my-2">
                          {t.name}
                        </h4>
                      </BlurFade>
                    </div>
                    <BlurFade delay={0.25 * 4} inView>
                      <div className="mb-3">
                        <span className="text-sm text-muted-foreground">
                          {t.role}
                        </span>
                      </div>
                    </BlurFade>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="pointer-events-none absolute inset-y-0 left-0 h-full w-2/12 bg-gradient-to-r from-white"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 h-full w-2/12 bg-gradient-to-l from-white"></div>
        </div>
        <div className="md:block hidden absolute bottom-0 left-1/2 -translate-x-1/2">
          <CarouselPrevious />
          <CarouselNext />
        </div>
      </Carousel>
    </Section>
  );
}

