"use client";

import React, { useState, FormEvent, useEffect } from "react";
import { Search, Home, Menu, RefreshCcw } from "lucide-react";
import Image from "next/image";
import { PropertyData } from "@/types/property";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyModal } from "@/components/PropertyModal";
import { FilterSection, Filters } from "@/components/FilterSection";

export type { PropertyData };

export default function Page() {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<PropertyData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({
    location: "",
    propertyType: "",
    beds: "",
    baths: "",
    minPrice: 500000,
    maxPrice: 25000000,
  });
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const API_BASE_URL = "https://ahmed-ayman-nawy-property-recommender.hf.space";

  // Fetch filter options and initial properties on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/filter-options`);
        if (response.ok) {
          const data = await response.json();
          setPropertyTypes(data.property_types || []);
          setLocations(data.locations || []);
        }
      } catch (e) {
        console.error("Failed to fetch filter options", e);
      }
    };
    fetchOptions();
  }, []);

  // Fetch initial properties on mount with caching
  useEffect(() => {
    const fetchInitialProperties = async () => {
      // Check session storage cache first
      const cached = sessionStorage.getItem("nawy_initial_properties");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setResults(parsed);
          return;
        } catch (e) {
          console.error("Failed to parse cached properties", e);
        }
      }

      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/properties?size=50`);
        if (!response.ok) throw new Error("Failed to load initial properties");
        
        const data = await response.json();
        const propertyList = data.data || [];
        setResults(propertyList);
        // Cache for the session
        sessionStorage.setItem("nawy_initial_properties", JSON.stringify(propertyList));
      } catch (err: any) {
        console.error("Initial fetch error:", err);
        // We don't set global error here to not break the search experience
      } finally {
        setIsLoading(false);
      }
    };

    if (!hasSearched) {
      fetchInitialProperties();
    }
  }, [hasSearched]);

  // Handle keyboard navigation and body scroll lock for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === "Escape") setSelectedIndex(null);
      if (e.key === "ArrowLeft" && selectedIndex > 0)
        setSelectedIndex(selectedIndex - 1);
      if (e.key === "ArrowRight" && selectedIndex < results.length - 1)
        setSelectedIndex(selectedIndex + 1);
    };

    if (selectedIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [selectedIndex, results.length]);

  const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/recommend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query,
            top_k: 50,
            size: 50
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data.data || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to fetch recommendations.");
      } else {
        setError("An unexpected error occurred.");
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterSearch = async () => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/filter`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            location: filters.location || null,
            property_type: filters.propertyType || null,
            Beds: filters.beds ? parseInt(filters.beds) : null,
            Baths: filters.baths ? parseInt(filters.baths) : null,
            min_price: filters.minPrice,
            max_price: filters.maxPrice,
            size: 50
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to filter properties.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (val.trim()) {
      // If typing in search, clear all filters
      setFilters({
        location: "",
        propertyType: "",
        beds: "",
        baths: "",
        minPrice: 500000,
        maxPrice: 25000000,
      });
    }
  };

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const resetToDiscover = () => {
    setQuery("");
    setHasSearched(false);
    setError(null);
    setFilters({
      location: "",
      propertyType: "",
      beds: "",
      baths: "",
      minPrice: 500000,
      maxPrice: 25000000,
    });
    
    const cached = sessionStorage.getItem("nawy_initial_properties");
    if (cached) {
      setResults(JSON.parse(cached));
    } else {
      window.location.reload(); 
    }
  };


  const filteredResults = React.useMemo(() => {
    if (!Array.isArray(results)) return [];
    return results;
  }, [results]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header / Hero Section */}
      <header className="bg-nawy-gradient text-white pt-6 pb-12 px-4 sm:px-6 lg:px-8 shadow-lg relative z-20">
        <div className="max-w-[1600px] mx-auto">
          {/* Logo & Title - Top Left Brand Area */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 shadow-inner">
              <Image
                src="/nawyestate_logo.jpeg"
                alt="Nawy Logo"
                width={28}
                height={28}
                className="rounded-md object-contain"
              />
            </div>
            <h1 className="text-sm md:text-base font-black tracking-tight text-white drop-shadow-md">
              Nawy <span className="bg-gradient-to-r from-[#5DBDB6] to-[#5DBDB6]/80 bg-clip-text text-transparent">Recommender</span>
            </h1>
          </div>

          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-block px-4 py-2 mt-0.5 mb-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden group">
              <div className="absolute inset-0 bg-linear-to-r from-[#5DBDB6]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <p className="text-[11px] md:text-sm text-slate-100 max-w-2xl mx-auto relative z-10 font-medium leading-relaxed tracking-wide">
                Find your <span className="text-[#5DBDB6] font-bold">perfect property</span> in Egypt using <span className="bg-linear-to-r from-[#5DBDB6] to-[#E94E3D] bg-clip-text text-transparent font-extrabold italic">AI</span>.
                <br />
                <span className="text-slate-300 text-[10px] md:text-xs font-normal mt-0.5 block opacity-80">
                  Just describe what you're looking for in plain English.
                </span>
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className={`relative max-w-2xl mx-auto shadow-2xl rounded-2xl sm:rounded-full bg-white flex flex-col sm:flex-row items-stretch sm:items-center p-1.5 focus-within:ring-4 focus-within:ring-[#5DBDB6]/30 transition-all border border-slate-100 ${
              (filters.location !== "" || filters.propertyType !== "" || filters.beds !== "" || filters.baths !== "" || filters.minPrice !== 500000 || filters.maxPrice !== 25000000) ? 'opacity-40 grayscale-[20%] pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="flex items-center flex-1 px-4 py-2.5 sm:py-0">
              <Search className="w-5 h-5 text-[#003D6B] shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="e.g., Apartment in New Cairo..."
                className="w-full px-3 text-slate-800 bg-transparent border-none focus:outline-none text-base"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#003D6B] hover:bg-[#004575] text-white px-8 py-3.5 sm:py-3 rounded-xl sm:rounded-full font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm whitespace-nowrap shrink-0 shadow-lg shadow-[#003D6B]/20 active:scale-95 m-1 sm:m-0"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Searching...
                </>
              ) : (
                "Find Homes"
              )}
            </button>
          </form>

          {/* Filters Section */}
          <div className={`${query ? 'opacity-40 grayscale-[20%] pointer-events-none' : 'opacity-100'} transition-all duration-500`}>
            <FilterSection 
              filters={filters} 
              setFilters={handleFilterChange as any} 
              onSearch={handleFilterSearch}
              propertyTypes={propertyTypes}
              locations={locations}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 -mt-12 pb-20 relative z-10">
        <div className="w-full">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm mb-8 max-w-3xl mx-auto">
            <h3 className="text-red-800 font-medium">
              Error connecting to the API
            </h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-md h-100 animate-pulse flex flex-col overflow-hidden"
              >
                <div className="h-48 bg-slate-200 w-full" />
                <div className="p-5 flex-1 flex flex-col gap-4">
                  <div className="h-6 bg-slate-200 w-3/4 rounded" />
                  <div className="h-4 bg-slate-200 w-1/2 rounded" />
                  <div className="flex gap-4 mt-auto">
                    <div className="h-4 bg-slate-200 w-12 rounded" />
                    <div className="h-4 bg-slate-200 w-12 rounded" />
                    <div className="h-4 bg-slate-200 w-12 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (hasSearched || results.length > 0) && filteredResults.length === 0 && !error && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center mt-16">
            <Home className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-slate-700">
              No properties found
            </h2>
            <p className="text-slate-500 mt-2">
              Try adjusting your search query or filters to find what you're looking for.
            </p>
            {(filters.location || filters.propertyType || filters.beds || filters.baths || filters.minPrice !== 500000 || filters.maxPrice !== 25000000) && (
              <button 
                onClick={() => setFilters({ location: "", propertyType: "", beds: "", baths: "", minPrice: 500000, maxPrice: 25000000 })}
                className="mt-4 text-[#5DBDB6] font-bold hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && filteredResults.length > 0 && (
          <div className="mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-2xl font-extrabold text-[#1A365D] pt-8">
                {hasSearched ? `Found ${filteredResults.length} Properties` : `Discover Properties (${filteredResults.length})`}
              </h2>
              {hasSearched && (
                <button
                  onClick={resetToDiscover}
                  className="flex items-center gap-2 px-4 py-2 bg-[#5DBDB6]/10 hover:bg-[#5DBDB6]/20 text-[#003D6B] font-bold rounded-xl transition-all border border-[#5DBDB6]/20 text-sm mt-0 sm:mt-8 group"
                >
                  <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                  Back to Discover
                </button>
              )}
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-4 sm:p-6 max-h-[75vh] min-h-[400px] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
                {filteredResults.map((property, idx) => (
                  <PropertyCard
                    key={property.id || idx}
                    property={property}
                    onClick={() => setSelectedIndex(idx)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        </div>
      </main>

      {/* Modal Overlay */}
      {selectedIndex !== null && filteredResults[selectedIndex] && (
        <PropertyModal
          property={filteredResults[selectedIndex]}
          currentIndex={selectedIndex}
          total={filteredResults.length}
          onClose={() => setSelectedIndex(null)}
          onNext={
            selectedIndex < filteredResults.length - 1
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
    </div>
  );
}
