import { useCallback, useEffect, useRef, type MutableRefObject, type Ref } from "react";
import DesignersLandingFeaturesSolarSection from "@/components/landing/DesignersLandingFeaturesSolarSection";
import LandingPricingEverythingIncluded from "@/components/landing/LandingPricingEverythingIncluded";
import { useIframeAutoHeight } from "@/hooks/useIframeAutoHeight";

const LANDING_NAV_HASHES = new Set(["#features", "#compare", "#how", "#pricing"]);
const IFRAME_BOTTOM_HASHES = new Set(["#compare", "#how", "#pricing"]);

/** Static HTML for the designers ads landing — independent of the homepage. */
const DESIGNERS_LANDING_HTML = "/lance-landing-designers.html";

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (value: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") ref(value);
      else (ref as MutableRefObject<T | null>).current = value;
    });
  };
}

function LandingIframe({
  src,
  title,
  iframeRef,
}: {
  src: string;
  title: string;
  iframeRef?: Ref<HTMLIFrameElement>;
}) {
  const { ref, height } = useIframeAutoHeight(src);
  return (
    <iframe
      ref={mergeRefs(ref, iframeRef)}
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

/** Ads landing at /designers — same flow as homepage, editable independently. */
const DesignersLanding: React.FC = () => {
  const bottomIframeRef = useRef<HTMLIFrameElement>(null);

  const scrollToLandingHash = useCallback((hash: string) => {
    if (!LANDING_NAV_HASHES.has(hash)) return;

    const updateUrl = () => {
      const path = window.location.pathname || "/designers";
      window.history.replaceState(null, "", `${path}${hash}`);
    };

    if (hash === "#features") {
      document.getElementById("features")?.scrollIntoView({ behavior: "smooth", block: "start" });
      updateUrl();
      return;
    }

    if (IFRAME_BOTTOM_HASHES.has(hash)) {
      bottomIframeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      bottomIframeRef.current?.contentWindow?.postMessage({ type: "lance-landing-scroll", hash }, "*");
      updateUrl();
    }
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "lance-landing-nav") return;
      const hash = event.data.hash;
      if (typeof hash !== "string" || !LANDING_NAV_HASHES.has(hash)) return;
      scrollToLandingHash(hash);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [scrollToLandingHash]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !LANDING_NAV_HASHES.has(hash)) return;
    const timer = window.setTimeout(() => scrollToLandingHash(hash), 400);
    return () => window.clearTimeout(timer);
  }, [scrollToLandingHash]);

  return (
    <div className="landing-compose" style={{ background: "#fff", minHeight: "100vh" }}>
      <LandingIframe src={`${DESIGNERS_LANDING_HTML}?part=top`} title="Lance designers landing" />
      <DesignersLandingFeaturesSolarSection />
      <LandingIframe
        iframeRef={bottomIframeRef}
        src={`${DESIGNERS_LANDING_HTML}?part=bottom`}
        title="Lance designers landing continued"
      />
      <LandingPricingEverythingIncluded />
      <LandingIframe
        src={`${DESIGNERS_LANDING_HTML}?part=bottom-tail`}
        title="Lance designers landing footer"
      />
    </div>
  );
};

export default DesignersLanding;
