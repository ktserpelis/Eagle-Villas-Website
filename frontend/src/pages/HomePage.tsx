// src/pages/HomePage.tsx
import HeroSlideshow from "../components/home/HeroSlideShow.tsx";
import PropertiesSection from "../components/home/PropertiesSection.tsx";
import LocationSection from "../components/home/LocationSection.tsx";
import BookNowSection from "../components/home/BookNowSection.tsx";
import HomeIntroSplit from "@/components/home/HomeIntroSplit.tsx";

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-stone-100 via-stone-100 to-stone-200">
      {/* 1) Hero – always full width */}
      <HeroSlideshow />

      {/* 
        2) Wrapper for all other sections:
           - mobile: container (max-w-6xl, px-4)
           - desktop: full width (max-w-none, px-0)
      */}
      <div className="max-w-6xl mx-auto px-4 md:max-w-none md:px-0 pb-14 space-y-16 md:space-y-24">
        {/* Intro + Location will decide their own width on desktop */}
        <HomeIntroSplit />
        <PropertiesSection />
        <LocationSection />
        <BookNowSection />
      </div>
    </div>
  );
}
