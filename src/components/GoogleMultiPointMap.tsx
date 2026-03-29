import React, { useEffect, useRef } from "react";
import { createRoot, Root } from "react-dom/client";
import { useNavigate } from "react-router-dom";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import type { Billboard } from "@/types/billboard.types";

interface GoogleMultiPointMapProps {
  billboards: Billboard[];
  center: [number, number];
  heightClassName?: string;
}

const GoogleMultiPointMap: React.FC<GoogleMultiPointMapProps> = ({
  billboards,
  center,
  heightClassName = "h-[420px] md:h-[600px]",
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRootRef = useRef<Root | null>(null);
  const infoWindowContentRef = useRef<HTMLDivElement | null>(null);
  const { isLoaded, loadError, hasApiKey } = useGoogleMaps();

  useEffect(() => {
    if (!hasApiKey || !isLoaded || !containerRef.current) return;

    const googleMaps = window.google.maps;

    if (!mapRef.current) {
      mapRef.current = new googleMaps.Map(containerRef.current, {
        center: { lat: center[0], lng: center[1] },
        zoom: 12,
        fullscreenControl: true,
        mapTypeControl: false,
        streetViewControl: false,
      });
    } else {
      mapRef.current.setCenter({ lat: center[0], lng: center[1] });
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const infoWindow = new googleMaps.InfoWindow();

    if (!infoWindowContentRef.current) {
      infoWindowContentRef.current = document.createElement("div");
      infoWindowRootRef.current = createRoot(infoWindowContentRef.current);
    }

    billboards
      .filter((billboard) => billboard.location.lat !== 0 && billboard.location.lng !== 0)
      .forEach((billboard) => {
        const marker = new googleMaps.Marker({
          position: { lat: billboard.location.lat, lng: billboard.location.lng },
          map: mapRef.current,
          title: billboard.title,
          animation: googleMaps.Animation.DROP,
        });

        marker.addListener("click", () => {
          if (infoWindowRootRef.current && infoWindowContentRef.current) {
            infoWindowRootRef.current.render(
              <div className="max-w-[220px] p-0">
                {billboard.photos[0] && (
                  <img
                    src={billboard.photos[0]}
                    alt={billboard.title}
                    className="mb-2 h-24 w-full rounded-lg object-cover"
                  />
                )}
                <h4 className="mb-1 truncate text-sm font-bold text-neutral-900">
                  {billboard.title}
                </h4>
                <p className="mb-1 text-xs text-neutral-500">
                  {billboard.location.address}, {billboard.location.city}
                </p>
                <p className="text-sm font-bold text-emerald-700">
                  NGN {billboard.pricing.daily.toLocaleString()}/day
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] uppercase text-neutral-600">
                    {billboard.type}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Traffic: {billboard.trafficScore}/10
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/billboards/${billboard.id}`)}
                  className="mt-3 w-full rounded-full bg-neutral-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-700"
                >
                  View Billboard
                </button>
              </div>,
            );
          }

          infoWindow.setContent(infoWindowContentRef.current);
          infoWindow.open({
            anchor: marker,
            map: mapRef.current,
          });
        });

        markersRef.current.push(marker);
      });
    return () => {
      infoWindowRootRef.current?.unmount();
      infoWindowRootRef.current = null;
      infoWindowContentRef.current = null;
    };
  }, [billboards, center, hasApiKey, isLoaded, navigate]);

  const overlay = loadError
    ? {
        title: "Map unavailable",
        message: "Google Maps failed to load. Check the API key and enabled APIs.",
      }
    : !hasApiKey
    ? {
        title: "Map unavailable",
        message: "Add VITE_GOOGLE_MAPS_API_KEY to load Google Maps.",
      }
    : {
        title: "Map unavailable",
        message: "Loading Google Maps...",
      };

  return (
    <div className={`relative w-full ${heightClassName}`}>
      <div ref={containerRef} className="h-full w-full outline-none" />
      {(!hasApiKey || loadError || !isLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-50 px-5 text-center">
          <div>
            <p className="text-sm font-medium text-neutral-800">
              {overlay.title}
            </p>
            <p className="mt-2 text-sm text-neutral-500">{overlay.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMultiPointMap;
