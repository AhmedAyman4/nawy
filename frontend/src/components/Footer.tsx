import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Linkedin, Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full py-2 sm:py-3 px-4 sm:px-6 lg:px-8 bg-[#003D6B] border-t border-white/5 relative z-10 mt-auto shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
      <div className="max-w-[1650px] mx-auto">
        {/* Main Footer Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
          {/* Logo & Copyright Area */}
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
            <Link href="/" className="flex items-center gap-2 group transition-transform active:scale-95">
              <div className="bg-white/10 p-1 rounded-lg border border-white/10 group-hover:bg-white/20 transition-colors">
                <Image
                  src="/favicon.svg"
                  alt="Property Recommender"
                  width={14}
                  height={14}
                  className="rounded-sm transition-transform group-hover:scale-110"
                />
              </div>
              <span className="text-[10px] sm:text-[11px] font-black text-white tracking-tight">Property <span className="text-[#5DBDB6]">Recommender</span></span>
            </Link>
          </div>

          {/* Attribution - Centered */}
          <div className="md:absolute md:left-1/2 md:-translate-x-1/2">
            <p className="text-[11px] sm:text-[13px] font-black text-center tracking-tight">
              <span className="text-white/40">Designed and built by</span>{' '}
              <span className="bg-gradient-to-r from-[#5DBDB6] to-white bg-clip-text text-transparent">Ahmed Ayman Alhofy</span>
            </p>
          </div>
          
          {/* Social Links & Contact */}
          <div className="flex items-center gap-2 sm:gap-3 mt-1 md:mt-0">
             <a 
              href="https://www.linkedin.com/in/ahmed-alhofy/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-1 sm:p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-[#5DBDB6] hover:bg-white/10 transition-all active:scale-95 group shadow-sm"
              title="LinkedIn Profile"
            >
              <Linkedin className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
            </a>
            <a 
              href="mailto:ahmedalhofy42@gmail.com"
              className="p-1 sm:p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-[#5DBDB6] hover:bg-white/10 transition-all active:scale-95 group shadow-sm"
              title="Send Email"
            >
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
