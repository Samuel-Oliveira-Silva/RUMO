import LandingHeader from "../components/landing/LandingHeader";
import Hero from "../components/landing/Hero";
import HowItWorks from "../components/landing/HowItWorks";
import Differentiator from "../components/landing/Differentiator";
import FinalCta from "../components/landing/FinalCta";

export default function LandingPage() {
  return (
    <div className="bg-paper">
      <LandingHeader />
      <Hero />
      <HowItWorks />
      <Differentiator />
      <FinalCta />
    </div>
  );
}
