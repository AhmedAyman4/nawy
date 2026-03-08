import React from "react";
import { MapPin, Bed, Bath, Maximize, ExternalLink } from "lucide-react";
import { PropertyData } from "@/types/property";

export function PropertyCard({
  property,
  onClick,
}: {
  property: PropertyData;
  onClick?: () => void;
}) {
  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>,
  ) => {
    e.currentTarget.src =
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
  };

  const handleLogoError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>,
  ) => {
    e.currentTarget.style.display = "none";
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col group text-sm cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative h-48 sm:h-32 overflow-hidden bg-slate-200">
        <img
          src={
            property.cover_image ||
            "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
          }
          alt={property.property_name || "Property"}
          onError={handleImageError}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Overlays */}
        <div className="absolute top-2 left-2 flex flex-col gap-2">
          {property.tag && (
            <span className="bg-[#E94E3D]/90 backdrop-blur-sm text-white text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full shadow-sm">
              {property.tag}
            </span>
          )}
        </div>

        {property.developer_logo && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1 rounded-md shadow-sm">
            <img
              src={property.developer_logo}
              alt="Developer"
              className="h-5 w-auto object-contain"
              onError={handleLogoError}
            />
          </div>
        )}

        {/* Price tag anchored to bottom of image */}
        <div className="absolute bottom-0 left-0 w-full bg-linear-to-t from-slate-900/80 to-transparent p-2 pt-6 text-white">
          <p className="text-sm font-bold">
            {property.price ||
              (property.price_float
                ? `${property.price_float.toLocaleString()} EGP`
                : "Price on Request")}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <h3
          className="font-bold text-sm text-[#1A365D] line-clamp-1 mb-0.5"
          title={property.property_name || ""}
        >
          {property.property_name || "Unnamed Property"}
        </h3>

        <div className="flex items-center text-slate-500 text-[11px] mb-2">
          <MapPin className="w-3 h-3 mr-1 shrink-0" />
          <span className="line-clamp-1">
            {property.location || "Location unavailable"}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-1 py-1.5 border-y border-slate-100 mb-2 text-slate-700">
          <div className="flex flex-col items-center justify-center p-1 bg-[#5DBDB6]/5 rounded-md">
            <Bed className="w-3.5 h-3.5 text-[#5DBDB6] mb-0.5" />
            <span className="text-[10px] font-semibold text-[#1A365D]">
              {property.Beds || "-"}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-1 bg-[#5DBDB6]/5 rounded-md">
            <Bath className="w-3.5 h-3.5 text-[#5DBDB6] mb-0.5" />
            <span className="text-[10px] font-semibold text-[#1A365D]">
              {property.Baths || "-"}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-1 bg-[#5DBDB6]/5 rounded-md">
            <Maximize className="w-3.5 h-3.5 text-[#5DBDB6] mb-0.5" />
            <span className="text-[9px] font-semibold whitespace-nowrap text-[#1A365D]">
              {property.m2 ? `${property.m2} m²` : "-"}
            </span>
          </div>
        </div>

        {/* Description snippet */}
        <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 flex-1 leading-relaxed">
          {property.description || "No description provided for this property."}
        </p>

        {/* Footer/Action */}
        <div className="mt-auto pt-1">
          {property.url_path ? (
            <a
              href={property.url_path}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-full gap-1.5 bg-slate-50 hover:bg-slate-100 text-[#003D6B] text-[10px] font-bold py-1.5 rounded-lg transition-colors border border-slate-100"
            >
              View on Nawy <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <button
              disabled
              className="w-full bg-slate-50 text-slate-400 text-[10px] font-medium py-1.5 rounded-lg cursor-not-allowed"
            >
              Link Unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
