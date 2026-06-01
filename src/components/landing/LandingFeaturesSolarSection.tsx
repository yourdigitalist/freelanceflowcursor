import FeatureSolarSystem from "@/components/landing/FeatureSolarSystem";
import "@/styles/feature-solar-system.css";
import "@/styles/landing-features-section.css";

export default function LandingFeaturesSolarSection() {
  return (
    <section className="landing-features-section section-enter visible" id="features">
      <div className="landing-features-inner centered">
        <span className="landing-section-label">✦ Features</span>
        <h2 className="landing-section-title">Your entire freelance stack. $29/month.</h2>
        <p className="landing-section-sub">
          Lance replaces the scattered pile of tools freelancers actually pay for — without the
          overlap, the logins, or the monthly guilt.
        </p>
        <div className="landing-features-solar-wrap">
          <FeatureSolarSystem />
        </div>
      </div>
    </section>
  );
}
