"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Scale, Loader2, Info, ArrowLeft, Home, Printer, History as HistoryIcon } from "lucide-react";
import { PropertyData } from "@/types/property";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id1 = searchParams.get("id1");
  const id2 = searchParams.get("id2");

  const [property1, setProperty1] = useState<PropertyData | null>(null);
  const [property2, setProperty2] = useState<PropertyData | null>(null);
  const [comparison, setComparison] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = "https://ahmed-ayman-nawy-property-recommender.hf.space";

  useEffect(() => {
    if (!id1 || !id2) {
      setError("Please select two properties to compare.");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let p1Data: PropertyData | null = null;
        let p2Data: PropertyData | null = null;
        
        const stored = localStorage.getItem('compare_properties');
        if (stored) {
          const properties: PropertyData[] = JSON.parse(stored);
          p1Data = properties.find(p => p.id.toString() === id1) || null;
          p2Data = properties.find(p => p.id.toString() === id2) || null;
        }

        if (!p1Data || !p2Data) {
          throw new Error("Property details not found. Please select them again from the search results.");
        }

        setProperty1(p1Data);
        setProperty2(p2Data);

        // Check for cached comparison in session storage to persist same session
        const cacheKey = `comparison_${id1}_${id2}`;
        const cachedData = sessionStorage.getItem(cacheKey);
        
        if (cachedData) {
          setComparison(cachedData);
          setIsLoading(false);
          return;
        }

        const compRes = await fetch(`${API_BASE_URL}/compare`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id1, id2 }),
        });

        if (!compRes.ok) {
          throw new Error("Failed to generate AI comparison.");
        }

        const compData = await compRes.json();
        setComparison(compData.comparison);
        // Save to cache
        sessionStorage.setItem(cacheKey, compData.comparison);

        // Save to comparison history
        const historyData = {
          id1,
          id2,
          property1: p1Data,
          property2: p2Data,
          timestamp: new Date().toISOString()
        };
        
        const existingHistory = JSON.parse(localStorage.getItem('comparison_history') || '[]');
        const alreadyExists = existingHistory.find((item: any) => 
          (item.id1 === id1 && item.id2 === id2) || (item.id1 === id2 && item.id2 === id1)
        );
        
        if (!alreadyExists) {
          const newHistory = [historyData, ...existingHistory].slice(0, 10); // Keep last 10
          localStorage.setItem('comparison_history', JSON.stringify(newHistory));
        }
      } catch (err: any) {
        console.error("Comparison error:", err);
        setError(err.message || "Could not generate comparison. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id1, id2]);

  useEffect(() => {
    if (property1 && property2) {
      const originalTitle = document.title;
      document.title = `${property1.property_name} vs ${property2.property_name} - Property Recommender`;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [property1, property2]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-[#5DBDB6] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-[#E94E3D] rounded-full animate-ping" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-[#1A365D]">Analyzing details...</p>
          <p className="text-slate-500">Our AI is evaluating specifications and location context.</p>
        </div>
      </div>
    );
  }

  if (error || !property1 || !property2) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-100">
          <Info className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-black text-[#1A365D] mb-4">{error || "Something went wrong"}</h1>
        <p className="text-slate-600 mb-10">We couldn't load the comparison data. This might be due to a connection issue or invalid property IDs.</p>
        <button
          onClick={() => router.push("/")}
          className="bg-[#003D6B] text-white px-10 py-4 rounded-full font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto shadow-xl shadow-[#003D6B]/20"
        >
          <Home className="w-5 h-5" /> Back to Search
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Navigation & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div className="flex items-center gap-5">
           <button 
            onClick={() => router.back()}
            className="p-3 bg-white shadow-md hover:bg-slate-50 rounded-2xl transition-all border border-slate-100 group"
            title="Go Back"
          >
            <ArrowLeft className="w-6 h-6 text-[#1A365D] group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-[#5DBDB6]/10 rounded-lg">
                  <Scale className="w-5 h-5 text-[#5DBDB6]" />
              </div>
              <h1 className="text-3xl font-black text-[#1A365D] tracking-tight">
                  AI Smart Comparison
              </h1>
            </div>
            <p className="text-slate-500 font-medium">Side-by-side analysis of your selected properties</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 no-print">
          <button
            onClick={() => window.print()}
            className="p-3 bg-white text-[#003D6B] font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 group"
          >
            <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Download PDF</span>
          </button>
          
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-white text-[#1A365D] font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
          >
            New Comparison
          </button>
          
          <button
            onClick={() => router.push("/history")}
            className="p-3 bg-[#5DBDB6]/10 text-[#5DBDB6] font-bold rounded-2xl border border-[#5DBDB6]/20 hover:bg-[#5DBDB6]/20 transition-all shadow-sm flex items-center gap-2 group"
          >
            <HistoryIcon className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            <span className="hidden sm:inline">History</span>
          </button>
        </div>
      </div>

      {/* Property Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-8 print:gap-4 mb-12">
         <PropertyMiniCard property={property1} color="#5DBDB6" label="Property A" />
         <PropertyMiniCard property={property2} color="#E94E3D" label="Property B" />
      </div>

      {/* AI Analysis Result */}
      <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-2xl border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Scale className="w-80 h-80 text-[#003D6B]" />
          </div>

          <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-[#003D6B] flex items-center justify-center text-white font-black italic shadow-lg no-print">AI</div>
                  <h2 className="text-xl font-bold text-[#1A365D]">Expert Analysis Verdict</h2>
              </div>

              <div className="markdown-content">
                  <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                          table: ({node, ...props}) => (
                          <div className="overflow-x-auto print:overflow-visible w-full my-8">
                              <table className="min-w-full" {...props} />
                          </div>
                          )
                      }}
                  >
                  {comparison}
                  </ReactMarkdown>
              </div>
          </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 text-center no-print">
          <p className="text-slate-400 text-sm mb-6">Comparison generated based on current market data and property specifications.</p>
          <button
              onClick={() => router.push("/")}
              className="bg-gradient-to-r from-[#003D6B] to-[#1A365D] text-white px-12 py-5 rounded-2xl font-black text-lg shadow-2xl shadow-[#003D6B]/30 hover:scale-105 active:scale-95 transition-all"
          >
              Back to Explore More Properties
          </button>
      </div>

      <style jsx global>{`
        /* AI Analysis Markdown Styling */
        .markdown-content table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border-radius: 1.5rem;
            overflow: hidden;
            margin: 2rem 0;
            border: 1px solid #f1f5f9;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        .markdown-content th {
            background-color: #f8fafc;
            padding: 1.25rem 1rem;
            text-align: left;
            font-weight: 800;
            color: #1a365d;
            border-bottom: 2px solid #e2e8f0;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.05em;
        }
        .markdown-content td {
            padding: 1.25rem 1rem;
            border-bottom: 1px solid #f1f5f9;
            color: #475569;
            font-size: 0.95rem;
            line-height: 1.5;
        }
        .markdown-content tr:last-child td {
            border-bottom: none;
        }
        .markdown-content h3 {
            color: #003d6b;
            font-weight: 900;
            font-size: 1.75rem;
            margin-top: 3rem;
            margin-bottom: 1.25rem;
            letter-spacing: -0.02em;
        }
        .markdown-content p {
            color: #475569;
            line-height: 1.8;
            margin-bottom: 1.5rem;
            font-size: 1.1rem;
        }
        .markdown-content strong {
            color: #1a365d;
            font-weight: 800;
        }
        .markdown-content ul {
            list-style-type: none;
            padding-left: 0;
            margin-bottom: 2rem;
        }
        .markdown-content li {
            margin-bottom: 0.75rem;
            color: #475569;
            font-size: 1.1rem;
            padding-left: 1.5rem;
            position: relative;
        }
        .markdown-content li::before {
            content: "→";
            position: absolute;
            left: 0;
            color: #5dbdb6;
            font-weight: bold;
        }

        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
          }
          .min-h-screen {
            height: auto !important;
            min-height: 0 !important;
            padding-top: 0 !important;
          }
          .max-w-6xl {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .shadow-2xl, .shadow-xl, .shadow-md, .shadow-sm {
            shadow: none !important;
            box-shadow: none !important;
            border: 1px solid #eee !important;
          }
          .bg-slate-50 {
            background-color: white !important;
          }
          .rounded-[32px], .rounded-3xl, .rounded-2xl {
            border-radius: 1rem !important;
          }
          }
          /* Ensure charts/colors print correctly */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}

function PropertyMiniCard({ property, color, label }: { property: PropertyData; color: string; label: string }) {
  return (
    <div className="bg-white p-6 md:p-8 print:p-4 rounded-3xl shadow-xl border-t-[12px] flex flex-col sm:flex-row print:flex-row items-start gap-8 print:gap-4 group hover:shadow-2xl transition-all duration-300 h-full" style={{ borderTopColor: color }}>
      <div className="w-full sm:w-40 print:w-20 h-40 print:h-20 rounded-2xl overflow-hidden bg-slate-100 shrink-0 shadow-inner">
        <img
          src={property.cover_image || ""}
          alt={property.property_name || ""}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
      </div>
      <div className="flex-1 min-w-0 w-full text-left">
        <div className="flex flex-row items-center justify-start gap-3 mb-4 print:mb-2 w-full">
            <span className="text-[10px] md:text-[11px] print:text-[8px] font-black uppercase tracking-[0.1em] px-3 py-1.5 print:px-2 print:py-0.5 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap shrink-0">
            {label}
            </span>
            <p className="text-xl md:text-2xl print:text-[11px] font-black tracking-tight whitespace-nowrap shrink-0" style={{ color }}>
                {property.price || (property.price_float ? `${property.price_float.toLocaleString()} EGP` : "N/A")}
            </p>
        </div>
        
        <h4 className="text-xl print:text-xs font-bold text-[#1A365D] mb-2 print:mb-1 leading-tight">{property.property_name || "Property Detail"}</h4>
        <p className="text-slate-500 font-medium mb-6 print:mb-2 flex items-center justify-start gap-2 print:text-[9px]">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            {property.location}
        </p>

        <div className="grid grid-cols-3 gap-3 print:gap-1 mb-6 print:mb-3">
            <div className="bg-slate-50 p-3 print:p-1.5 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] print:text-[7px] font-bold text-slate-400 uppercase mb-1 print:mb-0">Beds</p>
                <p className="font-black text-[#1A365D] print:text-[9px]">{property.Beds}</p>
            </div>
            <div className="bg-slate-50 p-3 print:p-1.5 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] print:text-[7px] font-bold text-slate-400 uppercase mb-1 print:mb-0">Baths</p>
                <p className="font-black text-[#1A365D] print:text-[9px]">{property.Baths}</p>
            </div>
            <div className="bg-slate-50 p-3 print:p-1.5 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] print:text-[7px] font-bold text-slate-400 uppercase mb-1 print:mb-0">Area</p>
                <p className="font-black text-[#1A365D] print:text-[9px] whitespace-nowrap">{property.m2} m²</p>
            </div>
        </div>

        {property.url_path && (
            <a 
                href={property.url_path.startsWith('http') ? property.url_path : `https://www.nawy.com${property.url_path.startsWith('/') ? '' : '/'}${property.url_path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] print:text-[9px] font-bold text-[#5DBDB6] hover:underline flex items-center gap-1"
            >
                View on Nawy.com ↗
            </a>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={
          <div className="flex flex-col items-center justify-center py-20 gap-6">
              <Loader2 className="w-16 h-16 text-[#5DBDB6] animate-spin" />
              <p className="font-bold text-slate-400">Loading comparison module...</p>
          </div>
      }>
        <CompareContent />
      </Suspense>
    </div>
  );
}
