"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heart, Home, ArrowLeft, Scale, X, Trash2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyModal } from "@/components/PropertyModal";
import { CompareModal } from "@/components/CompareModal";
import { useFavorites } from "@/context/FavoritesContext";
import { PropertyData } from "@/types/property";
import { LocationChat } from "@/components/LocationChat";

export default function FavoritesPage() {
  const router = useRouter();
  const { favorites } = useFavorites();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  const API_BASE_URL = "https://ahmed-ayman-nawy-property-recommender.hf.space";

  // Handle body scroll lock for modal
  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedIndex]);

  const handleCompareToggle = (id: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((p) => p !== id);
      }
      if (prev.length >= 2) {
        return [prev[0], id];
      }
      return [...prev, id];
    });
  };

  const clearComparison = () => setSelectedForCompare([]);

  const selectedProperties = React.useMemo(() => {
    return favorites.filter(p => selectedForCompare.includes(p.id.toString()));
  }, [favorites, selectedForCompare]);

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
            Saved <span className="text-[#5DBDB6]">Properties</span>
          </h1>
          <p className="text-white/70 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed px-4">
            Your personal collection of dream homes and investment opportunities.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1650px] mx-auto px-2 sm:px-6 lg:px-8 mt-6 sm:mt-12 pb-20 relative z-10">
        {favorites.length === 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-8 sm:p-16 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">No saved properties yet</h2>
            <p className="text-slate-500 mt-3 mb-8 max-w-md mx-auto text-xs sm:text-sm">
              Start exploring our premium listings and click the heart icon to save the ones you love.
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 bg-[#003D6B] text-white px-6 py-2.5 sm:px-8 sm:py-3 rounded-full font-bold shadow-lg shadow-[#003D6B]/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-[10px] sm:text-xs"
            >
              Start Exploring
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100 p-3 sm:p-8">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <h2 className="text-base sm:text-lg font-black text-[#1A365D]">
                Collection ({favorites.length})
              </h2>
            </div>
            
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-8">
              {favorites.map((property, idx) => (
                <PropertyCard
                  key={property.id}
                  property={{
                    ...property,
                    isSelectedForCompare: selectedForCompare.includes(property.id.toString()),
                    onCompareToggle: handleCompareToggle
                  }}
                  onClick={() => setSelectedIndex(idx)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Floating Compare Bar */}
        {selectedForCompare.length > 0 && (
          <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-10 duration-500 w-[calc(100%-2rem)] sm:w-auto">
            <div className="bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_10px_40px_rgba(0,0,0,0.15)] rounded-2xl sm:rounded-full px-4 sm:px-6 py-3 sm:py-4 flex flex-row items-center gap-3 sm:gap-6">
              <div className="flex -space-x-3 sm:-space-x-4 items-center shrink-0">
                {selectedProperties.map((p: PropertyData, i: number) => (
                  <div key={p.id} className="relative group shrink-0">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 sm:border-4 border-white overflow-hidden shadow-md transition-transform group-hover:scale-110 z-${20-i}`}>
                      <img src={p.cover_image || ""} alt="" className="w-full h-full object-cover" />
                    </div>
                    <button 
                        onClick={() => handleCompareToggle(p.id.toString())}
                        className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                        <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {selectedForCompare.length < 2 && (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 sm:border-4 border-white border-dashed bg-slate-50 flex items-center justify-center text-slate-300">
                        <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                )}
              </div>

              <div className="hidden xs:block h-8 w-px bg-slate-200" />

              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#5DBDB6]">
                    Property Comparison
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-[#1A365D] truncate">
                    {selectedForCompare.length === 1 
                        ? "Select one more to compare" 
                        : "Ready to compare properties"}
                </span>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                    onClick={clearComparison}
                    className="p-2 sm:p-3 text-slate-300 hover:text-red-500 transition-colors"
                    title="Clear selected"
                >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                    disabled={selectedForCompare.length < 2}
                    onClick={() => {
                      if (selectedForCompare.length === 2) {
                        localStorage.setItem('compare_properties', JSON.stringify(selectedProperties));
                        router.push(`/compare?id1=${selectedForCompare[0]}&id2=${selectedForCompare[1]}`);
                      }
                    }}
                    className="bg-gradient-to-r from-[#5DBDB6] to-[#003D6B] text-white px-4 sm:px-8 py-2.5 sm:py-3 rounded-full font-black text-[10px] sm:text-xs shadow-lg shadow-[#003D6B]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <Scale className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Compare Now</span><span className="xs:hidden">Compare</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Overlay */}
      {selectedIndex !== null && favorites[selectedIndex] && (
        <PropertyModal
          property={favorites[selectedIndex]}
          currentIndex={selectedIndex}
          total={favorites.length}
          onClose={() => setSelectedIndex(null)}
          onNext={
            selectedIndex < favorites.length - 1
              ? () => setSelectedIndex(selectedIndex + 1)
              : undefined
          }
          onPrev={
            selectedIndex > 0
              ? () => setSelectedIndex(selectedIndex - 1)
              : undefined
          }
        />
      )}

      {/* Compare Modal removed - now using dedicated page */}
      {/* Location Chat Widget */}
      <LocationChat apiBaseUrl={API_BASE_URL} isCompareBarVisible={selectedForCompare.length > 0} />
    </div>
  );
}
