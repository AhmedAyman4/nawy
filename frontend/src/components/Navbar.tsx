"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export const Navbar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Close menu on scroll
      if (isMenuOpen) setIsMenuOpen(false);

      // Show if we scrolled up, or if we are at the very top
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Hide if we scrolled down and are past the initial fold
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, isMenuOpen]);

  // Close menu when pathname changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { name: "Discover", href: "/" },
    { name: "Predictor", href: "/predictor" },
    { name: "Saved", href: "/favorites" },
    { name: "Chat", href: "/chat" },
  ];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl">
      <nav 
        className={`bg-white/95 backdrop-blur-md border border-slate-200/60 shadow-xl rounded-full transition-all duration-300 ease-out ${
          isVisible ? "translate-y-0 opacity-100" : "-translate-y-32 opacity-0"
        }`}
      >
        <div className="px-5 h-14 flex items-center justify-between relative">
          <Link href="/" className="flex items-center gap-2 shrink-0 relative z-10 px-1.5 py-1 rounded-full transition-all hover:bg-[#5DBDB6]/10 group">
            <Image
              src="/favicon.svg"
              alt="Property Recommender"
              width={18}
              height={18}
              className="rounded-md transition-transform group-hover:scale-110 shadow-sm shadow-[#5DBDB6]/20"
            />
            <span className="text-xs font-black text-[#003D6B]">Property <span className="text-[#5DBDB6]">Recommender</span></span>
          </Link>
          
          {/* Desktop Centered Links */}
          <div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                  pathname === link.href 
                    ? "bg-[#5DBDB6]/10 text-[#5DBDB6] shadow-sm shadow-[#5DBDB6]/5" 
                    : "text-[#003D6B] hover:bg-[#5DBDB6]/10 hover:text-[#5DBDB6]"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Mobile Toggle / Spacer */}
          <div className="flex items-center relative z-10">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-1.5 text-[#003D6B] hover:bg-[#5DBDB6]/10 rounded-full transition-all"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden md:block w-20" /> {/* Balanced spacing for the logo on the left */}
          </div>
        </div>
      </nav>

      {/* Improved Mobile Dropdown - Detached for better visual flow */}
      <div 
        className={`md:hidden absolute top-16 left-0 right-0 transition-all duration-300 ease-out origin-top ${
          isMenuOpen 
            ? "translate-y-0 opacity-100 scale-100" 
            : "-translate-y-4 opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-2xl rounded-2xl overflow-hidden p-2 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link 
              key={link.href}
              href={link.href} 
              className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                pathname === link.href 
                  ? "bg-[#5DBDB6]/10 text-[#5DBDB6]" 
                  : "text-[#003D6B] hover:bg-slate-50"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
