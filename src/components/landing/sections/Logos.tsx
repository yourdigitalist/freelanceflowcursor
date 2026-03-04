import Marquee from "@/components/landing/magicui/marquee";
import { useLandingContent } from "@/hooks/useLandingContent";

const defaultCompanies = [
  "Google",
  "Microsoft",
  "Amazon",
  "Netflix",
  "YouTube",
  "Instagram",
  "Uber",
  "Spotify",
];

export default function Logos() {
  const { data: content } = useLandingContent();
  const heading =
    content?.logos.heading ||
    "TRUSTED BY BUSY FREELANCERS AND SMALL TEAMS";

  const customLogos = content?.logos.imageUrls || [];

  const items =
    customLogos.length > 0
      ? customLogos.map((url, idx) => ({
          key: `custom-${idx}`,
          src: url,
          alt: `Logo ${idx + 1}`,
        }))
      : defaultCompanies.map((logo) => ({
          key: logo,
          src: `https://cdn.magicui.design/companies/${logo}.svg`,
          alt: logo,
        }));

  return (
    <section id="logos">
      <div className="container mx-auto px-4 md:px-8 py-12">
        <h3 className="text-center text-sm font-semibold text-gray-500">
          {heading}
        </h3>
        <div className="relative mt-6">
          <Marquee className="max-w-full [--duration:40s]">
            {items.map((logo) => (
              <img
                key={logo.key}
                width={112}
                height={40}
                src={logo.src}
                className="h-10 w-28 grayscale opacity-30"
                alt={logo.alt}
              />
            ))}
          </Marquee>
          <div className="pointer-events-none absolute inset-y-0 left-0 h-full w-1/3 bg-gradient-to-r from-white"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/3 bg-gradient-to-l from-white"></div>
        </div>
      </div>
    </section>
  );
}

