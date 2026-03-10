"use client";

import React, { useState, FormEvent, useEffect } from "react";
import { Search, Home, RefreshCcw } from "lucide-react";
import Image from "next/image";
import { PropertyData } from "@/types/property";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyModal } from "@/components/PropertyModal";
import { FilterSection, Filters } from "@/components/FilterSection";
import { CompareModal } from "@/components/CompareModal";
import { LocationChat } from "@/components/LocationChat";
import { Scale, X, Trash2, MessageCircle } from "lucide-react";

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
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

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
      setCurrentPage(1);
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
      setCurrentPage(1);
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
    setCurrentPage(1);
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
    if (!Array.isArray(results)) return [];
    return results.filter(p => selectedForCompare.includes(p.id.toString()));
  }, [results, selectedForCompare]);

  const filteredResults = React.useMemo(() => {
    if (!Array.isArray(results)) return [];
    return results;
  }, [results]);

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const paginatedResults = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredResults.slice(start, start + itemsPerPage);
  }, [filteredResults, currentPage]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header / Hero Section */}
      <header className="text-white pt-24 pb-12 px-4 sm:px-6 lg:px-8 shadow-2xl relative z-20 min-h-[400px] flex flex-col justify-center">
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
        
        <div className="max-w-[1600px] mx-auto relative z-10 w-full">

          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-block px-4 py-1.5 mt-0.5 mb-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden group">
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
      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-20 relative z-10">
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
          <div className="mt-14 sm:mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-lg font-black text-[#1A365D] pt-4 sm:pt-6">
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

            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100 p-3 sm:p-8">
              <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-8">
                {paginatedResults.map((property, idx) => {
                  const absoluteIdx = (currentPage - 1) * itemsPerPage + idx;
                  return (
                    <PropertyCard
                      key={property.id || absoluteIdx}
                      property={{
                          ...property,
                          isSelectedForCompare: selectedForCompare.includes(property.id.toString()),
                          onCompareToggle: handleCompareToggle
                      }}
                      onClick={() => setSelectedIndex(absoluteIdx)}
                    />
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest">
                    Page <span className="text-nawy-navy">{currentPage}</span> / {totalPages}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => {
                        setCurrentPage(p => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-100 text-slate-400 hover:bg-[#5DBDB6] hover:text-white disabled:opacity-30 transition-all text-xs"
                    >
                      &larr;
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {/* Efficient Page Window Logic */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          if (totalPages <= 5) return true;
                          if (page === 1 || page === totalPages) return true;
                          return Math.abs(page - currentPage) <= 1;
                        })
                        .map((page, index, array) => {
                          const elements = [];
                          if (index > 0 && page - array[index - 1] > 1) {
                            elements.push(
                              <span key={`dots-${page}`} className="text-slate-300 text-[10px] px-1 font-bold">...</span>
                            );
                          }
                          elements.push(
                            <button
                              key={page}
                              onClick={() => {
                                setCurrentPage(page);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-[11px] transition-all border ${
                                currentPage === page
                                  ? "bg-nawy-navy text-white border-nawy-navy shadow-md shadow-nawy-navy/10 scale-105"
                                  : "bg-white text-slate-400 border-slate-100 hover:border-[#5DBDB6] hover:text-[#5DBDB6]"
                              }`}
                            >
                              {page}
                            </button>
                          );
                          return elements;
                        })}
                    </div>

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => {
                        setCurrentPage(p => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-100 text-slate-400 hover:bg-[#5DBDB6] hover:text-white disabled:opacity-30 transition-all text-xs"
                    >
                      &rarr;
                    </button>
                  </div>
                </div>
              )}
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
                <span className="text-[10px] font-black uppercase tracking-widest text-[#5DBDB6]">
                    Property Comparison
                </span>
                <span className="text-xs sm:text-sm font-bold text-[#1A365D] truncate">
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
                    onClick={() => setIsCompareModalOpen(true)}
                    className="bg-gradient-to-r from-[#5DBDB6] to-[#003D6B] text-white px-4 sm:px-8 py-2.5 sm:py-3 rounded-full font-black text-xs sm:text-sm shadow-lg shadow-[#003D6B]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <Scale className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Compare Now</span><span className="xs:hidden">Compare</span>
                </button>
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
      {/* Compare Modal */}
      {isCompareModalOpen && selectedProperties.length === 2 && (
        <CompareModal
          property1={selectedProperties[0]}
          property2={selectedProperties[1]}
          onClose={() => setIsCompareModalOpen(false)}
          apiBaseUrl={API_BASE_URL}
        />
      )}
      {/* Location Chat Widget */}
      <LocationChat apiBaseUrl={API_BASE_URL} isCompareBarVisible={selectedForCompare.length > 0} />
    </div>
  );
}
