import CtaSection from "@/components/landing/sections/CtaSection";
import FAQ from "@/components/landing/sections/FAQ";
import Features from "@/components/landing/sections/Features";
import Footer from "@/components/landing/sections/Footer";
import Header from "@/components/landing/sections/Header";
import Hero from "@/components/landing/sections/Hero";
import HowItWorks from "@/components/landing/sections/HowItWorks";
import Logos from "@/components/landing/sections/Logos";
import PricingSection from "@/components/landing/sections/PricingSection";
import Problem from "@/components/landing/sections/Problem";
import Solution from "@/components/landing/sections/Solution";
import Testimonials from "@/components/landing/sections/Testimonials";
import TestimonialsCarousel from "@/components/landing/sections/TestimonialsCarousel";

const LpTest: React.FC = () => {
  return (
    <main className="magic-landing bg-white">
      <Header />
      <Hero />
      <Logos />
      <Problem />
      <Solution />
      <HowItWorks />
      <TestimonialsCarousel />
      <Features />
      <Testimonials />
      <PricingSection />
      <FAQ />
      <CtaSection />
      <Footer />
    </main>
  );
};

export default LpTest;

