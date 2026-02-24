// src/components/Navbar.tsx
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    navigate("/login");
  };

  const pillNavClass = ({ isActive }: { isActive: boolean }) => {
    // slightly more compact + bolder, styling otherwise same
    const base =
      "px-3.5 py-1.5 rounded-full font-bold text-sm lg:text-lg transition-colors";
    if (isActive) return `${base} bg-amber-500 text-amber-950 shadow-sm`;
    return `${base} text-stone-900 hover:bg-white hover:text-stone-900`;
  };

  const gradientClass = "from-white/60 via-white/40 to-transparent";

  return (
    <>
      <header
        className={`
          absolute top-0 left-0 right-0
          z-40
          border-none shadow-none
        `}
      >
        <div className="relative">
          <div
            className={`
              pointer-events-none
              absolute inset-0
              bg-gradient-to-b ${gradientClass}
            `}
          />

          <div className="relative mx-auto max-w-7xl flex items-center justify-between px-4 py-4">
            {/* Left: logo */}
            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="flex items-center gap-2 px-[1.125rem] py-1.5"
              >
                <img
                  src="/images/logo/logo eagle villas.jpg"
                  alt="Eagle Villas Logo"
                  className="h-14 w-auto object-contain rounded-lg border border-amber-300"
                />

                <span className="text-lg md:text-xl font-bold tracking-[0.16em] uppercase text-stone-900">
                  Eagle Villas
                </span>
              </Link>
            </div>


            {/* Center: main nav pills (desktop) */}
            <nav className="hidden md:flex items-center gap-4 lg:gap-6 absolute left-1/2 -translate-x-1/2">
              <NavLink to="/" className={pillNavClass}>
                Home
              </NavLink>
              <NavLink to="/properties" className={pillNavClass}>
                Our Villas
              </NavLink>
              <NavLink to="/contact" className={pillNavClass}>
                Contact
              </NavLink>

               <NavLink to="/lefkada" className={pillNavClass}>
               Location
              </NavLink>

              {user && (
                <>
                  <NavLink to="/dashboard" className={pillNavClass}>
                    Dashboard
                  </NavLink>
                  {user.role === "ADMIN" && (
                    <NavLink to="/admin" className={pillNavClass}>
                      Admin
                    </NavLink>
                  )}
                </>
              )}
            </nav>

            {/* Right: book + hamburger (desktop) */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                to="/properties"
                className="px-[1.125rem] py-1.5 rounded-full bg-amber-500 text-amber-950 text-base font-bold shadow-md shadow-amber-900/20 hover:bg-amber-400 transition-colors"
              >
                Book
              </Link>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 hover:bg-stone-100 transition"
                aria-label="Open sidebar"
              >
                <Bars3Icon className="h-6 w-6 text-stone-900" />
              </button>
            </div>

            {/* Mobile right side: book + hamburger */}
            <div className="flex items-center gap-2 md:hidden">
              <Link
                to="/properties"
                className="px-[1.125rem] py-1.5 rounded-full bg-amber-500 text-amber-950 text-sm font-bold shadow hover:bg-amber-400 transition-colors"
              >
                Book
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 bg-white/80 hover:bg-stone-100 transition"
                aria-label="Open menu"
              >
                <Bars3Icon className="h-6 w-6 text-stone-900" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="absolute right-0 top-0 h-full w-72 max-w-full bg-white text-stone-900 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-stone-200">
              <span className="font-semibold text-sm tracking-[0.16em] uppercase">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full border border-stone-300 hover:bg-stone-100"
                aria-label="Close menu"
              >
                <XMarkIcon className="h-5 w-5 text-stone-800" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-3 text-base font-semibold">
              <NavLink
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block text-center ${pillNavClass({ isActive })}`
                }
              >
                Home
              </NavLink>

              <NavLink
                to="/properties"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block text-center ${pillNavClass({ isActive })}`
                }
              >
                Our Villas
              </NavLink>

              <NavLink
                to="/contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block text-center ${pillNavClass({ isActive })}`
                }
              >
                Contact
              </NavLink>

              <NavLink
                to="/lefkada"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block text-center ${pillNavClass({ isActive })}`
                }
              >
                Location
              </NavLink>

              {user && (
                <>
                  <NavLink
                    to="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `block text-center ${pillNavClass({ isActive })}`
                    }
                  >
                    Dashboard
                  </NavLink>

                  {user.role === "ADMIN" && (
                    <NavLink
                      to="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `block text-center ${pillNavClass({ isActive })}`
                      }
                    >
                      Admin
                    </NavLink>
                  )}
                </>
              )}

              {/* ✅ Auth moved here */}
              {!user ? (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-2 py-2 rounded text-center font-bold hover:bg-stone-100"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-2 py-2 rounded text-center font-bold hover:bg-stone-100"
                  >
                    Register
                  </Link>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full px-2 py-2 rounded text-center font-bold hover:bg-stone-100"
                >
                  Logout
                </button>
              )}

              <Link
                to="/properties"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-2 py-2 mt-3 rounded-full bg-amber-500 text-amber-950 text-center font-bold hover:bg-amber-400"
              >
                Book
              </Link>
            </nav>

            <div className="px-4 py-3 text-[11px] text-stone-500 border-t border-stone-200">
              © {new Date().getFullYear()} Eagle Villas
            </div>
          </div>
        </div>
      )}
    </>
  );
}
