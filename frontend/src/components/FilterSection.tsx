"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, MapPin, Home, Bed, Bath, DollarSign, ListFilter } from "lucide-react";

export interface Filters {
  location: string;
  propertyType: string;
  beds: string;
  baths: string;
  minPrice: number;
  maxPrice: number;
}

interface FilterSectionProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  onSearch?: () => void;
  propertyTypes?: string[];
  locations?: string[];
}
const MIN_PRICE = 500000;
const MAX_PRICE = 25000000;
const STEP = 100000;

const bedOptions = ["1", "2", "3", "4", "5+"];
const bathOptions = ["1", "2", "3", "4", "5+"];

export function FilterSection({ filters, setFilters, onSearch, propertyTypes = [], locations = [] }: FilterSectionProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredLocations = locations.filter(loc => 
    loc.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const handleChange = (name: keyof Filters, value: any) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleBedClick = (val: string) => {
    handleChange("beds", filters.beds === val ? "" : val);
  };

  const handleBathClick = (val: string) => {
    handleChange("baths", filters.baths === val ? "" : val);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getBedsBathsLabel = () => {
    if (!filters.beds && !filters.baths) return "Beds and Baths";
    const b = filters.beds ? `${filters.beds} Bed${filters.beds !== "1" ? "s" : ""}` : "";
    const ba = filters.baths ? `${filters.baths} Bath${filters.baths !== "1" ? "s" : ""}` : "";
    return [b, ba].filter(Boolean).join(", ");
  };

  const getPriceLabel = () => {
    if (!filters.minPrice && !filters.maxPrice) return "Price Range";
    if (filters.minPrice === MIN_PRICE && filters.maxPrice === MAX_PRICE) return "Any Price";
    
    const format = (v: number) => {
      if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
      return (v / 1000).toFixed(0) + "K";
    };
    
    return `${format(filters.minPrice)} - ${format(filters.maxPrice)}`;
  };

  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name);
    if (name === "location") setLocationSearch("");
  };

  return (
    <div className="max-w-5xl mx-auto mt-8 px-2 animate-in fade-in slide-in-from-top-4 duration-700" ref={dropdownRef}>
      <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl sm:rounded-full border border-white/20 shadow-2xl flex flex-col md:flex-row items-stretch gap-2">
        
        {/* Location Custom Dropdown */}
        <div className="flex-1 relative min-w-[160px]">
          <button
            type="button"
            onClick={() => toggleDropdown("location")}
            className="w-full pl-11 pr-10 py-3 bg-white/90 border-none rounded-xl sm:rounded-l-full text-[#1A365D] text-sm font-medium focus:ring-2 focus:ring-[#5DBDB6] outline-none transition-all text-left flex items-center relative"
          >
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5DBDB6]">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="truncate">{filters.location || "Location"}</span>
            <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform duration-300 ${activeDropdown === "location" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "location" && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl p-2 z-50 animate-in zoom-in-95 duration-200 origin-top border border-slate-100">
              <div className="px-2 pb-2">
                <input
                  type="text"
                  placeholder="Search regions..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-[#5DBDB6] text-[#1A365D]"
                  autoFocus
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-0.5">
                <button
                  onClick={() => { handleChange("location", ""); setActiveDropdown(null); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${!filters.location ? "bg-[#5DBDB6]/10 text-[#5DBDB6]" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  All Regions
                </button>
                {filteredLocations.length > 0 ? (
                  filteredLocations.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => { handleChange("location", loc); setActiveDropdown(null); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${filters.location === loc ? "bg-[#5DBDB6]/10 text-[#5DBDB6]" : "text-slate-600 hover:bg-slate-50"}`}
                    >
                      {loc}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-slate-400 italic">No regions found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Property Type Custom Dropdown */}
        <div className="flex-1 relative min-w-[140px]">
          <button
            type="button"
            onClick={() => toggleDropdown("propertyType")}
            className="w-full pl-11 pr-10 py-3 bg-white/90 border-none rounded-xl text-[#1A365D] text-sm font-medium focus:ring-2 focus:ring-[#5DBDB6] outline-none transition-all text-left flex items-center relative"
          >
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5DBDB6]">
              <Home className="w-4 h-4" />
            </div>
            <span className="truncate">{filters.propertyType || "Property Type"}</span>
            <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform duration-300 ${activeDropdown === "propertyType" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "propertyType" && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl p-1.5 z-50 animate-in zoom-in-95 duration-200 origin-top border border-slate-100">
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                <button
                  onClick={() => { handleChange("propertyType", ""); setActiveDropdown(null); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${!filters.propertyType ? "bg-[#5DBDB6]/10 text-[#5DBDB6]" : "text-slate-600 hover:bg-slate-50"}`}
                >
                  All Types
                </button>
                {propertyTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => { handleChange("propertyType", type); setActiveDropdown(null); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${filters.propertyType === type ? "bg-[#5DBDB6]/10 text-[#5DBDB6]" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Beds & Baths Custom Dropdown */}
        <div className="flex-1 relative min-w-[160px]">
          <button
            type="button"
            onClick={() => toggleDropdown("bedsBaths")}
            className="w-full pl-11 pr-10 py-3 bg-white/90 border-none rounded-xl text-[#1A365D] text-sm font-medium focus:ring-2 focus:ring-[#5DBDB6] outline-none transition-all text-left flex items-center relative"
          >
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5DBDB6]">
              <Bed className="w-4 h-4" />
            </div>
            <span className="truncate">{getBedsBathsLabel()}</span>
            <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform duration-300 ${activeDropdown === "bedsBaths" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "bedsBaths" && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl p-4 z-50 animate-in zoom-in-95 duration-200 origin-top border border-slate-100">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-extrabold text-[#1A365D] mb-2 uppercase tracking-wider">Bedrooms</h3>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {bedOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleBedClick(opt)}
                        className={`w-9 h-9 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold transition-all ${
                          filters.beds === opt
                            ? "bg-[#003D6B] text-white border-[#003D6B] shadow-lg shadow-[#003D6B]/20"
                            : "bg-white text-slate-600 border-slate-200 hover:border-[#5DBDB6] hover:text-[#5DBDB6]"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-px bg-slate-100 w-full" />
                <div>
                  <h3 className="text-xs font-extrabold text-[#1A365D] mb-2 uppercase tracking-wider">Bathrooms</h3>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {bathOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleBathClick(opt)}
                        className={`w-9 h-9 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold transition-all ${
                          filters.baths === opt
                            ? "bg-[#003D6B] text-white border-[#003D6B] shadow-lg shadow-[#003D6B]/20"
                            : "bg-white text-slate-600 border-slate-200 hover:border-[#5DBDB6] hover:text-[#5DBDB6]"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Price Range Slider Dropdown */}
        <div className="flex-1 relative min-w-[200px]">
          <button
            type="button"
            onClick={() => toggleDropdown("priceRange")}
            className="w-full pl-11 pr-10 py-3 bg-white/90 border-none rounded-xl text-[#1A365D] text-sm font-medium focus:ring-2 focus:ring-[#5DBDB6] outline-none transition-all text-left flex items-center relative md:rounded-r-full"
          >
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5DBDB6]">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="truncate">{getPriceLabel()}</span>
            <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform duration-300 ${activeDropdown === "priceRange" ? "rotate-180" : ""}`} />
          </button>

          {activeDropdown === "priceRange" && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl p-4 z-50 animate-in zoom-in-95 duration-200 origin-top-right border border-slate-100">
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-[10px] font-extrabold text-[#1A365D] uppercase tracking-wider">Price Range</h3>
                  <button 
                    onClick={() => {
                        setFilters(prev => ({ ...prev, minPrice: MIN_PRICE, maxPrice: MAX_PRICE }));
                    }}
                    className="text-[10px] font-bold text-[#5DBDB6] hover:underline"
                  >
                    Reset
                  </button>
                </div>

                <div className="space-y-6 px-1 py-2">
                    <div className="relative h-1.5 bg-slate-100 rounded-full">
                        {/* Selected range highlight */}
                        <div 
                            className="absolute h-full bg-[#5DBDB6] rounded-full transition-all duration-300"
                            style={{ 
                                left: `${((filters.minPrice - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100}%`,
                                right: `${100 - ((filters.maxPrice - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100}%`
                            }}
                        />
                        
                        {/* Min Range Input */}
                        <input
                            type="range"
                            min={MIN_PRICE}
                            max={MAX_PRICE}
                            step={STEP}
                            value={filters.minPrice}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (val < filters.maxPrice) {
                                    handleChange("minPrice", val);
                                }
                            }}
                            className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent pointer-events-none cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#5DBDB6] [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#5DBDB6] [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:appearance-none"
                        />
                        
                        {/* Max Range Input */}
                        <input
                            type="range"
                            min={MIN_PRICE}
                            max={MAX_PRICE}
                            step={STEP}
                            value={filters.maxPrice}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (val > filters.minPrice) {
                                    handleChange("maxPrice", val);
                                }
                            }}
                            className="absolute top-0 left-0 w-full h-full appearance-none bg-transparent pointer-events-none cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#003D6B] [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#003D6B] [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:appearance-none"
                        />
                    </div>

                    <div className="flex justify-between items-center text-[#1A365D] gap-2">
                        <div className="flex-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 transition-all flex flex-col">
                            <label className="text-[8px] block opacity-50 font-extrabold mb-0.5">MIN EGP</label>
                            <input 
                              type="text"
                              readOnly
                              value={filters.minPrice.toLocaleString()}
                              className="bg-transparent border-none outline-none p-0 text-[11px] font-black w-full cursor-default"
                            />
                        </div>
                        <div className="w-2 h-0.5 bg-slate-200 rounded-full shrink-0" />
                        <div className="flex-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 transition-all flex flex-col items-end">
                            <label className="text-[8px] block opacity-50 font-extrabold mb-0.5">MAX EGP</label>
                            <input 
                              type="text"
                              readOnly
                              value={filters.maxPrice.toLocaleString()}
                              className="bg-transparent border-none outline-none p-0 text-[11px] font-black w-full text-right cursor-default"
                            />
                        </div>
                    </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Integrated Apply Button */}
        <button
          onClick={onSearch}
          className="bg-[#5DBDB6] hover:bg-[#4caaa4] text-white px-8 py-3 rounded-xl sm:rounded-full font-bold transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#5DBDB6]/20 active:scale-95 shrink-0"
        >
          <ListFilter className="w-4 h-4" />
          Apply
        </button>
      </div>
    </div>
  );
}
