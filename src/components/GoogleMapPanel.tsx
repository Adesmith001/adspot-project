import React, { useEffect, useRef } from "react";
import { MdDirections, MdLocationOn } from "react-icons/md";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";

interface GoogleMapPanelProps {
  latitude?: number;
  longitude?: number;
  addressFallback?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  heightClassName?: string;
}

const GoogleMapPanel: React.FC<GoogleMapPanelProps> = ({
  latitude,
  longitude,
  addressFallback,
  title = "Map Preview",
  subtitle = "Review the precise billboard location on Google Maps.",
  className = "",
  heightClassName = "h-[320px]",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isLoaded, loadError, hasApiKey } = useGoogleMaps();
  const hasGps =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    latitude !== 0 &&
    longitude !== 0;

  const directionsUrl = hasGps
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${latitude},${longitude}`
      )}`
    : addressFallback
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        addressFallback
      )}`
    : null;

  const iframeSrc = addressFallback
    ? `https://www.google.com/maps?q=${encodeURIComponent(
        addressFallback
      )}&output=embed`
    : null;

  useEffect(() => {
    if (!hasApiKey || !hasGps || !isLoaded || !containerRef.current) return;

    const googleMaps = window.google.maps;
    const center = { lat: latitude, lng: longitude };
    const map = new googleMaps.Map(containerRef.current, {
      center,
      zoom: 16,
      fullscreenControl: true,
      mapTypeControl: false,
      streetViewControl: false,
    });

    new googleMaps.Marker({ position: center, map });
  }, [hasApiKey, hasGps, isLoaded, latitude, longitude]);

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
    <div
      className={`rounded-2xl border border-neutral-200 bg-white ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
          <MdLocationOn size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
          <p className="text-xs text-neutral-500">{subtitle}</p>
        </div>
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100"
            aria-label="Open Google Maps directions"
          >
            <MdDirections size={16} />
            Directions
          </a>
        )}
      </div>

      <div className={`relative w-full ${heightClassName}`}>
        {hasGps && hasApiKey ? (
          <div ref={containerRef} className="h-full w-full" />
        ) : null}
        {!hasGps && iframeSrc ? (
          <iframe
            title="Map"
            src={iframeSrc}
            className="h-full w-full border-0"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : null}

        {hasGps && (!hasApiKey || loadError || !isLoaded) && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-50 px-5 text-center">
            <div>
              <p className="text-sm font-medium text-neutral-800">
                {overlay.title}
              </p>
              <p className="mt-2 text-sm text-neutral-500">{overlay.message}</p>
            </div>
          </div>
        )}

        {!hasGps && !iframeSrc && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-50 px-5 text-center">
            <div>
              <p className="text-sm font-medium text-neutral-800">
                Map unavailable
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                Add a complete address or exact map pin to preview this
                location.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleMapPanel;
