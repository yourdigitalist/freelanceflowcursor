import Section from "@/components/landing/Section";
import { buttonVariants } from "@/components/ui/button";
import { useLandingContent } from "@/hooks/useLandingContent";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export default function CtaSection() {
  const { data: content } = useLandingContent();
  const cta = content?.cta;

  const hasBgImage = cta?.bgImageUrl;
  const bgMode = cta?.bgMode || "cover";

  const wrapperClassName = hasBgImage
    ? cn(
        "rounded-xl py-16 bg-center bg-no-repeat",
        bgMode === "cover" && "bg-cover",
        bgMode === "contain" && "bg-contain",
      )
    : "bg-primary/10 rounded-xl py-16";

  return (
    <Section
      id="cta"
      title={cta?.title || "Ready to get started?"}
      subtitle={cta?.subtext || "Start your free trial today."}
      className={wrapperClassName}
      // inline style so admin can control background image
      // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
      style={hasBgImage ? { backgroundImage: `url(${cta.bgImageUrl})` } : {}}
    >
      <div className="flex flex-col w-full sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
        <Link
          to="/auth"
          className={cn(
            buttonVariants({ variant: "default" }),
            "w-full sm:w-auto text-background",
          )}
        >
          {cta?.buttonText || "Get started for free"}
        </Link>
      </div>
    </Section>
  );
}

