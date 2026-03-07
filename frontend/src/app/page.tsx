"use client";

import React, { useState, FormEvent, useEffect } from "react";
import { Search, Building2, Home } from "lucide-react";
import { PropertyData } from "@/types/property";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyModal } from "@/components/PropertyModal";

export type { PropertyData };

export default function Page() {
  const [query, setQuery] = useState<string>(
    "Apartment in New Cairo less than 15 million with 2 bedrooms",
  );
  const [results, setResults] = useState<PropertyData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

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
        "https://ahmed-ayman-nawy-property-recommender.hf.space/recommend",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query,
            top_k: 50,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data: PropertyData[] = await response.json();
      setResults(data);
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header / Hero Section */}
      <header className="bg-linear-to-r from-blue-900 to-slate-800 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex justify-center items-center gap-3 mb-6">
            <Building2 className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Nawy Recommender
            </h1>
          </div>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10">
            Find your perfect property in Egypt using AI. Just describe what
            you're looking for in plain English.
          </p>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="relative max-w-2xl mx-auto shadow-xl rounded-full bg-white flex items-center p-1.5 focus-within:ring-4 focus-within:ring-blue-500/30 transition-all"
          >
            <div className="pl-4 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Apartment in New Cairo less than 15 million..."
              className="w-full py-2 px-3 text-slate-800 bg-transparent border-none focus:outline-none text-base"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
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
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pb-20">
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
        {!isLoading && hasSearched && results.length === 0 && !error && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center mt-16">
            <Home className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-slate-700">
              No properties found
            </h2>
            <p className="text-slate-500 mt-2">
              Try adjusting your search query (e.g., try a different location or
              price range).
            </p>
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && results.length > 0 && (
          <div className="mt-8">
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-2xl font-bold text-slate-800 pt-8">
                Found {results.length} Properties
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {results.map((property, idx) => (
                <PropertyCard
                  key={property.id || idx}
                  property={property}
                  onClick={() => setSelectedIndex(idx)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Modal Overlay */}
        {selectedIndex !== null && results[selectedIndex] && (
          <PropertyModal
            property={results[selectedIndex]}
            currentIndex={selectedIndex}
            total={results.length}
            onClose={() => setSelectedIndex(null)}
            onNext={
              selectedIndex < results.length - 1
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
      </main>
    </div>
  );
}
