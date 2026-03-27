"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { History as HistoryIcon, Home, ArrowLeft, Scale, X, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PropertyData } from "@/types/property";
import { LocationChat } from "@/components/LocationChat";

interface HistoryItem {
  id1: string;
  id2: string;
  property1: PropertyData;
  property2: PropertyData;
  timestamp: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  const API_BASE_URL = "https://ahmed-ayman-nawy-property-recommender.hf.space";

  useEffect(() => {
    setMounted(true);
    const storedHistory = localStorage.getItem("comparison_history");
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("comparison_history");
    setHistory([]);
  };

  const removeHistoryItem = (id1: string, id2: string) => {
    const newHistory = history.filter(
      (item) => !(item.id1 === id1 && item.id2 === id2)
    );
    setHistory(newHistory);
    localStorage.setItem("comparison_history", JSON.stringify(newHistory));
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header Section */}
      <header className="text-white pt-20 sm:pt-24 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 shadow-2xl relative z-20 min-h-[300px] sm:min-h-[350px] flex flex-col justify-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Image
            src="/luxury_hero.jpg"
            alt="Luxury Property Background"
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#003D6B]/90 via-[#003D6B]/60 to-[#003D6B]/80 backdrop-blur-[2px]" />
        </div>
        
        <div className="max-w-[1600px] mx-auto relative z-10 w-full text-center">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-4 sm:mb-6 group bg-white/5 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/10"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider">Back to Discover</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3 sm:mb-4 tracking-tight">
            Comparison <span className="text-[#5DBDB6]">History</span>
          </h1>
          <p className="text-white/70 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed px-4 font-medium">
            Review your previous AI-powered property analyses from this session.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-12 pb-20 relative z-10">
        {history.length === 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-8 sm:p-16 text-center border border-slate-100">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <HistoryIcon className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">No recent comparisons</h2>
            <p className="text-slate-500 mt-3 mb-8 max-w-md mx-auto text-xs sm:text-sm">
              Your property comparisons will appear here once you've generated your first AI analysis.
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 bg-[#003D6B] text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-[#003D6B]/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-[10px] sm:text-xs"
            >
              Start Comparing
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base sm:text-lg font-black text-[#1A365D] flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-[#5DBDB6]" />
                Recent Analyses ({history.length})
              </h2>
              <button 
                onClick={clearHistory}
                className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {history.map((item, idx) => (
                <div 
                  key={`${item.id1}-${item.id2}`}
                  className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden hover:shadow-2xl transition-all group flex flex-col md:flex-row items-stretch"
                >
                  <div className="flex-1 p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6">
                    <HistoryPropertyCard property={item.property1} color="#5DBDB6" label="Property A" />
                    <div className="flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[#1A365D] font-black italic shadow-inner">
                            VS
                        </div>
                    </div>
                    <HistoryPropertyCard property={item.property2} color="#E94E3D" label="Property B" />
                  </div>
                  
                  <div className="bg-slate-50 md:w-64 border-t md:border-t-0 md:border-l border-slate-100 p-6 flex flex-col justify-center items-center text-center gap-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <button
                        onClick={() => {
                          localStorage.setItem('compare_properties', JSON.stringify([item.property1, item.property2]));
                          router.push(`/compare?id1=${item.id1}&id2=${item.id2}`);
                        }}
                        className="w-full bg-[#003D6B] text-white px-6 py-3 rounded-2xl font-black text-xs shadow-lg shadow-[#003D6B]/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 group/btn"
                    >
                        View Analysis <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                    <button
                        onClick={() => removeHistoryItem(item.id1, item.id2)}
                        className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors"
                    >
                        Remove from history
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Location Chat Widget */}
      <LocationChat apiBaseUrl={API_BASE_URL} isCompareBarVisible={false} />
    </div>
  );
}

function HistoryPropertyCard({ property, color, label }: { property: PropertyData; color: string; label: string }) {
  return (
    <div className="flex-1 w-full flex items-center gap-4">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 shrink-0 shadow-inner ring-2 ring-white">
        <img
          src={property.cover_image || ""}
          alt={property.property_name || ""}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 mb-1 inline-block border border-slate-100">
          {label}
        </span>
        <h4 className="font-bold text-[#1A365D] truncate text-xs sm:text-sm">{property.property_name || "Property"}</h4>
        <p className="text-[10px] sm:text-[11px] font-black mt-1" style={{ color }}>{property.price || (property.price_float ? `${property.price_float.toLocaleString()} EGP` : "N/A")}</p>
      </div>
    </div>
  );
}
