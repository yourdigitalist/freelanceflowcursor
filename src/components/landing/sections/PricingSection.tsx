import Section from "@/components/landing/Section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useLandingContent } from "@/hooks/useLandingContent";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export default function PricingSection() {
  const { data: content } = useLandingContent();
  const pricing = content?.pricing;

  const plans = [
    {
      name: "Early Access Monthly",
      period: "month",
      price: pricing?.priceMonthly || "$29",
      yearlyPrice: pricing?.priceMonthly || "$29",
      description: pricing?.trialNote || "Full access. 15-day free trial.",
      features:
        pricing?.features || [
          "Unlimited projects & clients",
          "Time tracking & invoicing",
          "Client reviews & approvals",
          "Cancel anytime",
        ],
      isPopular: false,
      buttonText: pricing?.cta || "Start 15-day free trial",
    },
    {
      name: "Early Access Annual",
      period: "year",
      price: pricing?.priceYearly || "$290",
      yearlyPrice: pricing?.priceYearly || "$290",
      description:
        (pricing?.yearlyNote || "2 months free (pay $290/year)") +
        " " +
        (pricing?.trialNote || "15-day free trial."),
      features: [
        "Everything in Monthly",
        pricing?.yearlyNote || "2 months free (pay $290/year)",
        "Early access to new features",
        "Best value",
      ],
      isPopular: true,
      buttonText: pricing?.cta || "Start 15-day free trial",
    },
  ];

  return (
    <Section
      id="pricing"
      title={pricing?.title || "Pricing"}
      subtitle={pricing?.subtitle || "Choose the plan that fits you best"}
      className="bg-neutral-100 dark:bg-neutral-900"
    >
      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 mt-12 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              "flex flex-col border-border",
              plan.isPopular && "border-primary shadow-lg",
            )}
          >
            <CardHeader>
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide">
                  {plan.isPopular ? (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                      Most popular
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 text-transparent">
                      Most popular
                    </span>
                  )}
                </p>
              </div>
              <h3 className="mt-2 text-sm font-semibold text-primary">
                {plan.name}
              </h3>
              <p className="mt-2 text-3xl font-bold">
                {plan.price}
                <span className="text-sm font-normal text-muted-foreground">
                  /{plan.period}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {plan.period === "month" ? "Billed monthly" : "Billed yearly"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">1 user seat included</p>
              <p className="mt-4 text-sm text-muted-foreground">
                {plan.description}
              </p>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link to="/auth" className="w-full">
                <Button
                  className="w-full"
                  variant={plan.isPopular ? "default" : "outline"}
                >
                  {plan.buttonText}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </Section>
  );
}

