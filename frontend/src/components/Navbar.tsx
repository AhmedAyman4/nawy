"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export const Navbar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
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
  }, [lastScrollY]);

  return (
    <nav 
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-full transition-all duration-500 ease-in-out ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-32 opacity-0"
      }`}
    >
      <div className="px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 active:scale-95 transition-transform">
          <Image
            src="/nawyestate_logo.jpeg"
            alt="Nawy Logo"
            width={28}
            height={28}
            className="rounded-full"
          />
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-extrabold text-[#003D6B] leading-tight">
              Nawy Recommender
            </span>
            <span className="text-[9px] font-medium text-slate-500 leading-none">
              Intelligent Home Search
            </span>
          </div>
        </Link>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-6">
            <button className="text-xs font-bold text-nawy-navy/70 hover:text-nawy-teal transition-colors uppercase tracking-wider">
              Discover
            </button>
            <button className="text-xs font-bold text-nawy-navy/70 hover:text-nawy-teal transition-colors uppercase tracking-wider">
              Saved
            </button>
          </div>
          <button className="bg-nawy-navy text-white px-5 py-2 rounded-full text-[11px] font-black shadow-lg shadow-nawy-navy/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest">
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
};
