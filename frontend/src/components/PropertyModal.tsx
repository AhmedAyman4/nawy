import React from "react";
import {
  MapPin,
  Bed,
  Bath,
  Maximize,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
} from "lucide-react";
import { PropertyData } from "@/types/property";
import { useFavorites } from "@/context/FavoritesContext";

export function PropertyModal({
  property,
  currentIndex,
  total,
  onClose,
  onNext,
  onPrev,
}: {
  property: PropertyData;
  currentIndex: number;
  total: number;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}) {
  const { toggleFavorite, isFavorite } = useFavorites();
  const favorited = isFavorite(property.id);

  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>,
  ) => {
    e.currentTarget.src =
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-6"
      onClick={onClose}
    >
      {/* Main Modal Container */}
      <div
        className="relative w-full max-w-[88%] sm:max-w-2xl md:max-w-3xl max-h-[80vh] md:max-h-[80vh] bg-white rounded-3xl md:rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Action Buttons: Close and Favorite */}
        <div className="absolute top-3 right-3 z-30 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(property);
            }}
            className={`p-2 rounded-full backdrop-blur-md shadow-lg transition-all duration-300 transform border ${favorited ? "bg-red-500 text-white border-white scale-110" : "bg-white/90 hover:bg-white text-slate-800 border-slate-100 hover:scale-110"}`}
            title={favorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${favorited ? "fill-current" : ""}`}
            />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-full shadow-lg backdrop-blur-md transition-all border border-slate-100 active:scale-90"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Left Side: Image */}
        <div className="w-full md:w-[40%] h-36 sm:h-56 md:h-auto relative bg-slate-200 shrink-0">
          <img
            src={
              property.cover_image ||
              "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            }
            alt={property.property_name || "Property"}
            onError={handleImageError}
            className="w-full h-full object-cover"
          />

          <div className="absolute top-4 left-4 flex gap-2">
            {property.tag && (
              <span className="bg-[#E94E3D]/90 backdrop-blur-sm text-white text-[10px] sm:text-xs uppercase tracking-wider font-bold px-2.5 py-1 rounded-full shadow-sm">
                {property.tag}
              </span>
            )}
          </div>

          {/* Result Counter Overlay */}
          <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-md">
            {currentIndex + 1} / {total}
          </div>
        </div>

        {/* Right Side: Content */}
        <div className="w-full md:w-[60%] flex flex-col p-3.5 sm:p-5 md:p-6 overflow-y-auto">
          {property.developer_logo && (
            <img
              src={property.developer_logo}
              alt="Developer"
              className="h-8 w-auto object-contain mb-3"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}

          <h2 className="text-lg font-extrabold text-[#1A365D] mb-1 pr-8 leading-tight">
            {property.property_name || "Unnamed Property"}
          </h2>

          <div className="flex items-center text-slate-500 text-xs mb-3">
            <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <span>{property.location || "Location unavailable"}</span>
          </div>

          <div className="bg-[#5DBDB6]/5 p-2 rounded-xl mb-2.5 border border-[#5DBDB6]/10">
            <p className="text-[10px] text-[#5DBDB6] font-extrabold uppercase tracking-widest mb-0.5">Asking Price</p>
            <p className="text-lg sm:text-2xl font-black text-[#1A365D]">
              {property.price ||
                (property.price_float
                  ? `${property.price_float.toLocaleString()} EGP`
                  : "Price on Request")}
            </p>
            {property.payment_plan && (
              <p className="text-[10px] font-bold text-[#E94E3D] mt-1 bg-[#E94E3D]/10 inline-block px-2 py-0.5 rounded-full border border-[#E94E3D]/20">
                {property.payment_plan}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="flex flex-col items-center justify-center p-2 bg-[#5DBDB6]/5 rounded-lg border border-[#5DBDB6]/10">
              <Bed className="w-4 h-4 text-[#5DBDB6] mb-1" />
              <span className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">
                Beds
              </span>
              <span className="font-bold text-xs text-[#1A365D]">
                {property.Beds || "-"}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 bg-[#5DBDB6]/5 rounded-lg border border-[#5DBDB6]/10">
              <Bath className="w-4 h-4 text-[#5DBDB6] mb-1" />
              <span className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">
                Baths
              </span>
              <span className="font-bold text-xs text-[#1A365D]">
                {property.Baths || "-"}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 bg-[#5DBDB6]/5 rounded-lg border border-[#5DBDB6]/10">
              <Maximize className="w-4 h-4 text-[#5DBDB6] mb-1" />
              <span className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">
                Area
              </span>
              <span className="font-bold text-xs text-[#1A365D]">
                {property.m2 ? `${property.m2} m²` : "-"}
              </span>
            </div>
          </div>

          <div className="mb-3">
            <h3 className="font-bold text-[#1A365D] mb-1 text-sm">
              Property Details
            </h3>
            <p className="text-slate-600 leading-relaxed text-xs whitespace-pre-wrap line-clamp-4">
              {property.description ||
                "No specific details were provided for this property."}
            </p>
          </div>

          <div className="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-2.5">
            {property.url_path ? (
              <a
                href={property.url_path}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full gap-2 bg-[#003D6B] hover:bg-[#004575] text-white font-black py-2.5 sm:py-3 rounded-xl transition-all shadow-lg shadow-[#003D6B]/20 text-xs sm:text-sm active:scale-[0.98]"
              >
                View on Nawy <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                disabled
                className="w-full bg-slate-100 text-slate-400 font-semibold py-3 sm:py-3.5 rounded-xl cursor-not-allowed text-sm sm:text-base"
              >
                External Link Unavailable
              </button>
            )}

            {/* Navigation Controls Below Button */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={onPrev}
                disabled={!onPrev}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-[#003D6B] font-bold text-sm transition-colors border border-slate-100"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                {currentIndex + 1} / {total}
              </div>
              <button
                onClick={onNext}
                disabled={!onNext}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-[#003D6B] font-bold text-sm transition-colors border border-slate-100"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
