"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize, 
  Calculator, 
  Sparkles,
  TrendingUp,
  Info,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import Image from "next/image";

interface PredictionResult {
  location: string;
  property_type: string;
  m2: number;
  Beds: number;
  Baths: number;
  predicted_price_egp: number;
  predicted_price_formatted: string;
}

export default function PredictorPage() {
  const [formData, setFormData] = useState({
    location: "",
    property_type: "",
    m2: 150,
    Beds: 2,
    Baths: 2,
  });

  const [locations, setLocations] = useState<string[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptionsLoading, setIsOptionsLoading] = useState(true);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = "https://ahmed-ayman-nawy-property-recommender.hf.space";

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/filter-options`);
        if (response.ok) {
          const data = await response.json();
          setLocations(data.locations || []);
          setPropertyTypes(data.property_types || []);
          
          // Set defaults if available
          if (data.locations?.length > 0) {
            setFormData(prev => ({ 
              ...prev, 
              location: data.locations[0],
              property_type: data.property_types[0] || ""
            }));
          }
        }
      } catch (e) {
        console.error("Failed to fetch options", e);
        setError("Could not load location data. Please refresh.");
      } finally {
        setIsOptionsLoading(false);
      }
    };
    fetchOptions();
  }, []);

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/predict-price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to predict price. Please try again.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const increment = (field: "Beds" | "Baths" | "m2", step: number = 1) => {
    setFormData(prev => ({ ...prev, [field]: prev[field] + step }));
  };

  const decrement = (field: "Beds" | "Baths" | "m2", step: number = 1) => {
    setFormData(prev => ({ ...prev, [field]: Math.max(1, prev[field] - step) }));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Hero Header */}
      <header className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/luxury_hero.jpg"
            alt="Real Estate AI Background"
            fill
            className="object-cover opacity-20 scale-110 blur-[2px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/0 via-slate-50/80 to-slate-50" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5DBDB6]/10 border border-[#5DBDB6]/20 text-[#003D6B] text-[10px] font-black uppercase tracking-widest mb-6 animate-fade-in">
                <Sparkles className="w-3 h-3 text-[#5DBDB6]" />
                Powered by XGBoost & AI
            </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#003D6B] mb-6 tracking-tight">
            Predict Property <span className="text-[#5DBDB6]">Prices.</span>
          </h1>
          <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto font-medium">
            Get instant, AI-powered price estimations for properties across Egypt based on real market data.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Form Section */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-10 transition-all hover:shadow-slate-200/50">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-[#003D6B] flex items-center justify-center text-white shadow-lg shadow-[#003D6B]/20">
                    <Calculator className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-black text-[#003D6B]">Estimation Tool</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fill in the property details</p>
                </div>
              </div>

              <form onSubmit={handlePredict} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Location Selection */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-black text-[#003D6B] uppercase tracking-widest ml-1">
                      <MapPin className="w-3.5 h-3.5 text-[#5DBDB6]" />
                      Location
                    </label>
                    <div className="relative group">
                      <select
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        disabled={isOptionsLoading}
                        className="w-full h-12 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs focus:ring-4 focus:ring-[#5DBDB6]/10 focus:border-[#5DBDB6] transition-all appearance-none cursor-pointer"
                      >
                        {isOptionsLoading ? (
                          <option>Loading locations...</option>
                        ) : (
                          locations.map(loc => (
                            <option key={loc} value={loc}>{loc}</option>
                          ))
                        )}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-[#5DBDB6] transition-colors">
                        <ChevronRight className="w-5 h-5 rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* Property Type Selection */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-black text-[#003D6B] uppercase tracking-widest ml-1">
                      <Building2 className="w-3.5 h-3.5 text-[#5DBDB6]" />
                      Property Type
                    </label>
                    <div className="relative group">
                      <select
                        value={formData.property_type}
                        onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                        disabled={isOptionsLoading}
                        className="w-full h-12 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs focus:ring-4 focus:ring-[#5DBDB6]/10 focus:border-[#5DBDB6] transition-all appearance-none cursor-pointer"
                      >
                        {isOptionsLoading ? (
                          <option>Loading types...</option>
                        ) : (
                          propertyTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))
                        )}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-[#5DBDB6] transition-colors">
                        <ChevronRight className="w-5 h-5 rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Area Input */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs font-black text-[#003D6B] uppercase tracking-widest ml-1">
                    <Maximize className="w-3.5 h-3.5 text-[#5DBDB6]" />
                    Total Area (m²)
                  </label>
                  <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                    <button 
                      type="button" 
                      onClick={() => decrement("m2", 10)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-[#003D6B] hover:bg-[#5DBDB6]/10 hover:text-[#5DBDB6] transition-all font-black text-lg active:scale-95"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={formData.m2}
                      onChange={(e) => setFormData({ ...formData, m2: Number(e.target.value) })}
                      className="flex-1 text-center bg-transparent border-none focus:outline-none font-black text-slate-700 text-base"
                    />
                    <button 
                      type="button" 
                      onClick={() => increment("m2", 10)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-[#003D6B] hover:bg-[#5DBDB6]/10 hover:text-[#5DBDB6] transition-all font-black text-lg active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Beds & Baths */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-black text-[#003D6B] uppercase tracking-widest ml-1">
                      <Bed className="w-3.5 h-3.5 text-[#5DBDB6]" />
                      Bedrooms
                    </label>
                    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                      <button 
                        type="button" 
                        onClick={() => decrement("Beds")}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-[#003D6B] hover:bg-[#5DBDB6]/10 hover:text-[#5DBDB6] transition-all font-black text-lg active:scale-95"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-black text-slate-700 text-base">{formData.Beds}</span>
                      <button 
                        type="button" 
                        onClick={() => increment("Beds")}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-[#003D6B] hover:bg-[#5DBDB6]/10 hover:text-[#5DBDB6] transition-all font-black text-lg active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-black text-[#003D6B] uppercase tracking-widest ml-1">
                      <Bath className="w-3.5 h-3.5 text-[#5DBDB6]" />
                      Bathrooms
                    </label>
                    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                      <button 
                        type="button" 
                        onClick={() => decrement("Baths")}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-[#003D6B] hover:bg-[#5DBDB6]/10 hover:text-[#5DBDB6] transition-all font-black text-lg active:scale-95"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-black text-slate-700 text-base">{formData.Baths}</span>
                      <button 
                        type="button" 
                        onClick={() => increment("Baths")}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-[#003D6B] hover:bg-[#5DBDB6]/10 hover:text-[#5DBDB6] transition-all font-black text-lg active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isOptionsLoading}
                  className="w-full h-14 bg-[#003D6B] hover:bg-[#003D6B]/90 text-white rounded-xl font-black text-base shadow-xl shadow-[#003D6B]/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  {isLoading ? (
                    <>
                      <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                      Crunching data...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6" />
                      Estimate Price
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Results side */}
          <div className="lg:col-span-5 h-full">
            <div className={`h-full flex flex-col transition-all duration-700 ${result ? 'opacity-100 translate-y-0' : 'opacity-60 grayscale-[50%] pointer-events-none'}`}>
              
              {/* Main Result Card */}
              <div className={`bg-gradient-to-br from-[#003D6B] to-[#001D3D] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-center min-h-[400px] sm:min-h-[auto] ${result ? 'animate-in zoom-in-95' : ''}`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#5DBDB6] opacity-5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -ml-20 -mb-20 blur-3xl pointer-events-none" />
                
                {!result ? (
                   <div className="text-center py-12 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 scale-animation">
                        <TrendingUp className="w-8 h-8 text-[#5DBDB6]" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Ready to estimate?</h3>
                    <p className="text-slate-400 text-[11px] max-w-xs mx-auto">Fill the form and hit the button to see the AI magic happens.</p>
                   </div>
                ) : (
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 text-[#5DBDB6] text-[10px] font-black uppercase tracking-widest mb-2 px-1">
                        <Sparkles className="w-3 h-3" />
                        Estimation Successful
                    </div>
                    <h3 className="text-2xl font-black mb-1">Market Value</h3>
                    <p className="text-slate-400 text-[11px] font-medium mb-8">Estimated for {result.property_type} in {result.location}</p>
                    
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-sm group hover:bg-white/10 transition-colors">
                        <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Estimated Price</div>
                        <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-2">
                            {result.predicted_price_formatted.split(' ')[0]}
                            <span className="text-lg sm:text-xl text-[#5DBDB6]">EGP</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Area</div>
                            <div className="text-[10px] font-black">{result.m2} m²</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Beds</div>
                            <div className="text-[10px] font-black">{result.Beds}</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Baths</div>
                            <div className="text-[10px] font-black">{result.Baths}</div>
                        </div>
                    </div>
                    
                    <div className="mt-10 pt-6 border-t border-white/10">
                        <button 
                          onClick={() => window.location.href = `/?query=${encodeURIComponent(result.property_type + ' in ' + result.location)}`}
                          className="w-full py-3.5 rounded-xl bg-white text-[#003D6B] font-black text-xs flex items-center justify-center gap-2 hover:bg-[#5DBDB6] hover:text-white transition-all shadow-lg shadow-black/20"
                        >
                            Find Similar Properties
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Tips */}
              <div className="mt-8 space-y-4">
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <Info className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-blue-900 mb-1 leading-none pt-1">About the AI Model</h4>
                        <p className="text-[10px] text-blue-700/70 font-medium leading-relaxed">Our model uses historical pricing data from thousands of listings in Egypt to provide real-time estimations.</p>
                    </div>
                </div>
                
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-slate-900 mb-1 leading-none pt-1">Market Trends</h4>
                        <p className="text-[10px] text-slate-600/70 font-medium leading-relaxed">Real estate prices in Egypt are dynamic. Use this as a benchmark for your buying or selling decisions.</p>
                    </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Error Message if any */}
        {error && (
            <div className="mt-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-center font-bold text-sm">
                {error}
            </div>
        )}
      </main>

        <style jsx>{`
            .scale-animation {
                animation: scale-up-down 3s ease-in-out infinite;
            }
            @keyframes scale-up-down {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            .animate-fade-in {
                animation: fade-in 1s ease-out;
            }
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `}</style>
    </div>
  );
}
