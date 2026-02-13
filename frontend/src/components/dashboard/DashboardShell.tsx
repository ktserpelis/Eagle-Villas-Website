// src/components/dashboard/DashboardShell.tsx
import React from "react";

/**
 * Reusable layout wrapper for the user dashboard page.
 * Keeps the hero image + overlapping content layout consistent.
 */
export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-stone-100 min-h-screen">
      {/* Hero image */}
      <div className="relative w-full h-[55vh] sm:h-[65vh]">
        <img
          src="\images\image00016.jpeg"
          alt="Eagle Villas Account"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/65" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />
      </div>

      {/* Overlapping content container */}
      <div className="relative w-full mx-auto px-4 lg:px-8 pb-12 -mt-36 sm:-mt-44 lg:-mt-52 z-10">
        {children}
      </div>
    </div>
  );
}
