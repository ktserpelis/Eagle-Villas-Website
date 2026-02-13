// src/pages/ContactPage.tsx
import ContactForm from "../components/contact/ContactForm";
import FeaturedVillasContactCarousel from "../components/contact/FeaturedVillasContactCarousel";
import ContactMap from "../components/contact/ContactMap";

export default function ContactPage() {
  return (
    <div className="bg-stone-100 min-h-screen">
      {/* Top hero image – tall, clean */}
      <div className="relative w-full h-[80vh]">
        <img
          src="/images/homehero/Screenshot 2025-01-28 183637.webp"
          alt="Contact Eagle Villas"
          className="w-full h-full object-cover"
        />
        {/* warm overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/60" />
      </div>

      {/* Overlapping content (title + components), pulled higher */}
      <div className="relative w-full mx-auto px-4 lg:px-8 pb-12 -mt-40 sm:-mt-44 lg:-mt-50 z-10">
        {/* Title ABOVE the components, same colors */}
        <div className="mb-8 text-left">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/95">
            Contact
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-amber-50">
            Let&apos;s plan your stay at Eagle Villas
          </h1>
          <p className="mt-3 text-sm sm:text-base text-amber-50/90 max-w-2xl">
            Share your dates, questions or special requests, and we&apos;ll get
            back to you personally as soon as possible.
          </p>
        </div>

        {/* Grid: form + right column (carousel + map) */}
       <div className="grid gap-6 lg:gap-8 xl:gap-10 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)] items-start">
          {/* Left: contact form */}
          <div>
            <ContactForm />
          </div>

          {/* Right: carousel + map, stacked */}
          <div className="space-y-6">
            <FeaturedVillasContactCarousel />
            <ContactMap />
          </div>
        </div>
      </div>
    </div>
  );
}
