import FeatureSolarSystem from "@/components/landing/FeatureSolarSystem";
import "@/styles/feature-solar-system.css";
import "@/styles/landing-features-section.css";

export default function DesignersLandingFeaturesSolarSection() {
  return (
    <section className="landing-features-section section-enter visible" id="features">
      <div className="landing-features-inner centered">
        <span className="landing-section-label">✦ Features</span>
        <h2 className="landing-section-title">Your entire design business. $29/month.</h2>
        <p className="landing-section-sub">
          Lance replaces the scattered pile of tools designers actually pay for. No overlap, no
          extra logins, no monthly guilt.
        </p>
        <div className="landing-features-solar-wrap">
          <FeatureSolarSystem />
        </div>
      </div>
    </section>
  );
}
