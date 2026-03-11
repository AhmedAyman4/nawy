import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full py-3 sm:py-5 px-4 sm:px-6 lg:px-8 bg-[#003D6B] border-t border-white/5 relative z-10 mt-auto shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
      <div className="max-w-[1650px] mx-auto">
        {/* Main Footer Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
          {/* Logo & Copyright Area */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
            <Link href="/" className="flex items-center gap-2 group transition-transform active:scale-95">
              <div className="bg-white/10 p-1 rounded-lg border border-white/10 group-hover:bg-white/20 transition-colors">
                <Image
                  src="/favicon.svg"
                  alt="Property Recommender"
                  width={16}
                  height={16}
                  className="rounded-sm transition-transform group-hover:scale-110"
                />
              </div>
              <span className="text-[11px] sm:text-xs font-black text-white tracking-tight">Property <span className="text-[#5DBDB6]">Recommender</span></span>
            </Link>
            <div className="hidden sm:block h-3 w-px bg-white/10" />
            <p className="text-[9px] sm:text-[10px] text-white/30 font-bold uppercase tracking-widest">
              © {new Date().getFullYear()} Nawy
            </p>
          </div>

          {/* Attribution - Centered */}
          <div className="md:absolute md:left-1/2 md:-translate-x-1/2 scale-95 sm:scale-100 py-1">
            <p className="text-[10px] sm:text-[12px] font-black text-center">
              <span className="text-white/40">Designed and built by</span>{" "}
              <span className="bg-gradient-to-r from-[#5DBDB6] to-white bg-clip-text text-transparent">Ahmed Ayman Alhofy</span>
            </p>
          </div>
          
          {/* Spacer for desktop layout balance */}
          <div className="hidden md:block w-48" /> 
        </div>
      </div>
    </footer>
  );
};
