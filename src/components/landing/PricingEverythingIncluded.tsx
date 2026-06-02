import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PRICING_EVERYTHING_INCLUDED } from "@/lib/landingPricingIncluded";
import "@/styles/pricing-everything-included.css";

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="included-features">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function PricingEverythingIncluded() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="included-wrap">
      <button
        type="button"
        className="included-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? "Hide everything included" : "See everything included"}</span>
        <ChevronDown className={`included-trigger-icon${open ? " is-open" : ""}`} aria-hidden />
      </button>

      <div
        id={panelId}
        className={`included-panel${open ? " is-open" : ""}`}
        aria-hidden={!open}
      >
        <div className="included-table" role="region" aria-label="Everything included in Lance">
          {PRICING_EVERYTHING_INCLUDED.map((section, index) => (
            <section
              key={section.id}
              className="included-category"
              style={{ animationDelay: open ? `${index * 25}ms` : undefined }}
            >
              <header className="included-category-header">
                <h3 className="included-category-title">{section.title}</h3>
                {section.tagline ? (
                  <p className="included-category-tagline">{section.tagline}</p>
                ) : null}
              </header>

              {section.items.length > 0 ? <FeatureList items={section.items} /> : null}

              {section.subsections?.map((sub) => (
                <div key={sub.title} className="included-subsection">
                  <h4 className="included-subsection-title">{sub.title}</h4>
                  <FeatureList items={sub.items} />
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
