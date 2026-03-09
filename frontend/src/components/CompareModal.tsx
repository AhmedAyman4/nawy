import React, { useState, useEffect } from "react";
import { X, Scale, ArrowRight, Loader2, Info } from "lucide-react";
import { PropertyData } from "@/types/property";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CompareModalProps {
  property1: PropertyData;
  property2: PropertyData;
  onClose: () => void;
  apiBaseUrl: string;
}

export function CompareModal({
  property1,
  property2,
  onClose,
  apiBaseUrl,
}: CompareModalProps) {
  const [comparison, setComparison] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComparison = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiBaseUrl}/compare`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id1: property1.id.toString(),
            id2: property2.id.toString(),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch comparison");
        }

        const data = await response.json();
        setComparison(data.comparison);
      } catch (err: any) {
        console.error("Comparison error:", err);
        setError("Could not generate comparison. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchComparison();
  }, [property1.id, property2.id, apiBaseUrl]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 md:p-8 overflow-hidden"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-full max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-[#003D6B] to-[#1A365D] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <Scale className="w-6 h-6 text-[#5DBDB6]" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">AI Smart Comparison</h2>
              <p className="text-xs text-slate-300 font-medium">Comparing these two exclusive properties</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-slate-50/50">
          {/* Property Quick View */}
          <div className="flex flex-col md:flex-row gap-6 mb-10">
            <PropertyMiniCard property={property1} color="#5DBDB6" label="Property A" />
            <div className="hidden md:flex items-center justify-center shrink-0">
              <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center border border-slate-100 text-[#003D6B] font-black italic">
                VS
              </div>
            </div>
            <PropertyMiniCard property={property2} color="#E94E3D" label="Property B" />
          </div>

          {/* AI Analysis */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Scale className="w-64 h-64 text-[#003D6B]" />
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="relative">
                    <Loader2 className="w-12 h-12 text-[#5DBDB6] animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-[#E94E3D] rounded-full animate-ping" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-lg font-bold text-[#1A365D]">Analyzing details...</p>
                    <p className="text-sm text-slate-500">Our AI is evaluating market trends and specifications.</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                    <Info className="w-8 h-8" />
                </div>
                <p className="text-[#1A365D] font-bold text-lg">{error}</p>
                <button 
                    onClick={onClose}
                    className="mt-6 px-6 py-2 bg-[#003D6B] text-white rounded-full font-bold hover:scale-105 transition-transform"
                >
                    Go Back
                </button>
              </div>
            ) : (
              <div className="markdown-content">
                <style jsx>{`
                  .markdown-content :global(table) {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1.5rem 0;
                    border-radius: 1rem;
                    overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                  }
                  .markdown-content :global(th) {
                    background-color: #f8fafc;
                    padding: 1rem;
                    text-align: left;
                    font-weight: 800;
                    color: #1a365d;
                    border-bottom: 2px solid #e2e8f0;
                  }
                  .markdown-content :global(td) {
                    padding: 1rem;
                    border-bottom: 1px solid #f1f5f9;
                    color: #475569;
                    font-size: 0.875rem;
                  }
                  .markdown-content :global(tr:last-child td) {
                    border-bottom: none;
                  }
                  .markdown-content :global(h3) {
                    color: #003d6b;
                    font-weight: 900;
                    font-size: 1.25rem;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                  }
                  .markdown-content :global(p) {
                    color: #475569;
                    line-height: 1.6;
                    margin-bottom: 1rem;
                  }
                  .markdown-content :global(strong) {
                    color: #1a365d;
                    font-weight: 700;
                  }
                  .markdown-content :global(ul) {
                    list-style-type: disc;
                    padding-left: 1.5rem;
                    margin-bottom: 1.5rem;
                  }
                  .markdown-content :global(li) {
                    margin-bottom: 0.5rem;
                    color: #475569;
                  }
                `}</style>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {comparison}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#5DBDB6] to-[#5DBDB6]/80 text-white font-black shadow-lg shadow-[#5DBDB6]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            Start New Comparison <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PropertyMiniCard({ property, color, label }: { property: PropertyData; color: string; label: string }) {
  return (
    <div className="flex-1 bg-white p-4 rounded-2xl shadow-md border-t-4 flex items-center gap-4 group hover:shadow-lg transition-shadow" style={{ borderTopColor: color }}>
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
        <img
          src={property.cover_image || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"}
          alt={property.property_name || ""}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 mb-1 inline-block">
          {label}
        </span>
        <h4 className="font-bold text-[#1A365D] truncate text-sm">{property.property_name || "Property Detail"}</h4>
        <p className="text-xs text-slate-500 font-medium truncate">{property.location}</p>
        <p className="text-sm font-black mt-1" style={{ color }}>{property.price || (property.price_float ? `${property.price_float.toLocaleString()} EGP` : "N/A")}</p>
      </div>
    </div>
  );
}
