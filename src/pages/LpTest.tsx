import LandingFeaturesSolarSection from "@/components/landing/LandingFeaturesSolarSection";
import LandingPricingEverythingIncluded from "@/components/landing/LandingPricingEverythingIncluded";
import { useIframeAutoHeight } from "@/hooks/useIframeAutoHeight";

function LandingIframe({ src, title }: { src: string; title: string }) {
  const { ref, height } = useIframeAutoHeight(src);
  return (
    <iframe
      ref={ref}
      src={src}
      title={title}
      scrolling="no"
      style={{
        width: "100%",
        height: `${height}px`,
        border: "none",
        display: "block",
      }}
    />
  );
}

const LpTest: React.FC = () => {
  return (
    <div className="landing-compose" style={{ background: "#fff", minHeight: "100vh" }}>
      <LandingIframe src="/lance-landing-identical.html?part=top" title="Lance landing" />
      <LandingFeaturesSolarSection />
      <LandingIframe src="/lance-landing-identical.html?part=bottom" title="Lance landing continued" />
      <LandingPricingEverythingIncluded />
      <LandingIframe src="/lance-landing-identical.html?part=bottom-tail" title="Lance landing footer" />
    </div>
  );
};

export default LpTest;
