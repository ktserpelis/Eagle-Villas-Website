import { useState } from "react";
import { Link } from "react-router-dom";
import { TermsModal } from "./TermsModal";

export function Footer() {
  const [termsOpen, setTermsOpen] = useState(false);

  return (
    <footer className="mt-auto bg-stone-900 text-stone-100">
      {/* Top content */}
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10 grid gap-6 md:grid-cols-3 text-sm">
        {/* Brand / description */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <img
                  src="/images/logo/logo eagle villas.jpg"
                  alt="Eagle Villas Logo"
                  className="h-10 w-auto object-contain rounded-lg border border-amber-300"
                />
            <span className="text-sm font-semibold tracking-[0.16em] uppercase text-amber-50">
              Eagle Villas
            </span>
          </div>

          <p className="text-xs text-stone-300 leading-relaxed max-w-xs">
            A small collection of villas in Sivota, Greece, designed with warm
            interiors, sea views and a calm atmosphere.
          </p>

          {/* ✅ Terms & Conditions BELOW brand text */}
          <button
            type="button"
            onClick={() => setTermsOpen(true)}
            className="inline-block text-xs text-stone-400 hover:text-amber-300 transition-colors underline underline-offset-4 decoration-stone-500 hover:decoration-amber-300"
          >
            Terms & Conditions
          </button>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-300 mb-3">
            Navigate
          </h3>
          <nav className="space-y-2 text-xs">
            <Link
              to="/"
              className="block text-stone-200 hover:text-amber-300 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/properties"
              className="block text-stone-200 hover:text-amber-300 transition-colors"
            >
              Our Villas
            </Link>
            <Link
              to="/contact"
              className="block text-stone-200 hover:text-amber-300 transition-colors"
            >
              Contact
            </Link>
          </nav>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-300 mb-3">
            Contact
          </h3>
          <div className="space-y-1.5 text-xs text-stone-300">
            <p>Eagle Villas, Sivota, Greece</p>
            <p>Email: eagleluxuryvillas@gmail.com</p>
            <p>Phone: +30 6942885021</p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-stone-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] text-stone-400">
          <span>
            © {new Date().getFullYear()} Eagle Villas. All rights reserved.
          </span>

          <span className="flex items-center gap-1">
            Created by{" "}
            <a
              href="www.linkedin.com/in/konstantinos-tserpelis-205782289"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-300 hover:text-amber-300 transition-colors underline underline-offset-4 decoration-stone-600 hover:decoration-amber-300"
            >
              Konstantinos Tserpelis
            </a>
          </span>
        </div>
      </div>
      {/* Terms modal */}
      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </footer>
  );
}
