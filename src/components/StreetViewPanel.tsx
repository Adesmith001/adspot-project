import React, { useEffect, useRef, useState } from "react";
import { MdOutlineStreetview } from "react-icons/md";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";

interface StreetViewPanelProps {
  latitude?: number;
  longitude?: number;
  addressFallback?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  heightClassName?: string;
}

const StreetViewPanel: React.FC<StreetViewPanelProps> = ({
  latitude,
  longitude,
  addressFallback,
  title = "Street View",
  subtitle = "Preview the billboard context from street level.",
  className = "",
  heightClassName = "h-[320px]",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [statusMessage, setStatusMessage] = useState("Loading street view...");
  const [hasStreetView, setHasStreetView] = useState(false);
  const [resolvedCoordinates, setResolvedCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const { isLoaded, loadError, hasApiKey } = useGoogleMaps();

  const hasExactGps =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    latitude !== 0 &&
    longitude !== 0;

  const effectiveLatitude = hasExactGps ? latitude : resolvedCoordinates?.latitude;
  const effectiveLongitude = hasExactGps
    ? longitude
    : resolvedCoordinates?.longitude;

  const hasResolvedCoordinates =
    typeof effectiveLatitude === "number" &&
    typeof effectiveLongitude === "number" &&
    effectiveLatitude !== 0 &&
    effectiveLongitude !== 0;

  const mapsUrl = hasResolvedCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${effectiveLatitude},${effectiveLongitude}`
      )}`
    : addressFallback
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        addressFallback
      )}`
    : null;

  useEffect(() => {
    setResolvedCoordinates(null);
    setHasStreetView(false);
    setStatusMessage(
      hasExactGps
        ? "Loading street view..."
        : addressFallback
        ? "Finding the street position for this listing..."
        : "Street view needs an exact map pin for this listing."
    );
  }, [addressFallback, hasExactGps, latitude, longitude]);

  useEffect(() => {
    if (!hasApiKey || loadError || hasExactGps || !isLoaded || !addressFallback) {
      return;
    }

    let cancelled = false;
    setIsResolvingAddress(true);
    setStatusMessage("Finding the street position for this listing...");

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      {
        address: addressFallback,
        region: "NG",
      },
      (results, status) => {
        if (cancelled) return;

        if (status === "OK" && results?.[0]?.geometry?.location) {
          const location = results[0].geometry.location;
          setResolvedCoordinates({
            latitude: location.lat(),
            longitude: location.lng(),
          });
          setStatusMessage("Checking street-level imagery...");
        } else {
          setResolvedCoordinates(null);
          setStatusMessage(
            "We could not resolve an exact roadside position from the saved address."
          );
        }

        setIsResolvingAddress(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [addressFallback, hasApiKey, hasExactGps, isLoaded, loadError]);

  useEffect(() => {
    if (
      !hasApiKey ||
      loadError ||
      !isLoaded ||
      !hasResolvedCoordinates ||
      !containerRef.current
    ) {
      return;
    }

    containerRef.current.innerHTML = "";
    setStatusMessage("Checking street-level imagery...");

    const googleMaps = window.google.maps;
    const streetViewService = new googleMaps.StreetViewService();

    streetViewService.getPanorama(
      {
        location: { lat: effectiveLatitude, lng: effectiveLongitude },
        radius: 120,
        source: googleMaps.StreetViewSource.OUTDOOR,
      },
      (data, status) => {
        if (
          status === googleMaps.StreetViewStatus.OK &&
          data?.location?.pano &&
          containerRef.current
        ) {
          const pov =
            typeof data?.tiles?.centerHeading === "number"
              ? {
                  heading: data.tiles.centerHeading,
                  pitch: 0,
                }
              : undefined;

          new googleMaps.StreetViewPanorama(containerRef.current, {
            pano: data.location.pano,
            ...(pov ? { pov } : {}),
            zoom: 1,
            addressControl: false,
            linksControl: true,
            panControl: true,
            enableCloseButton: false,
            fullscreenControl: true,
            motionTracking: false,
          });

          setHasStreetView(true);
          return;
        }

        setHasStreetView(false);
        setStatusMessage(
          "Street view imagery is not available for this exact point yet."
        );
      }
    );
  }, [
    effectiveLatitude,
    effectiveLongitude,
    hasApiKey,
    hasResolvedCoordinates,
    isLoaded,
    loadError,
  ]);

  const overlay = loadError
    ? {
        title: "Street view unavailable",
        message: "Google Maps failed to load. Check the API key and enabled APIs.",
      }
    : !hasApiKey
    ? {
        title: "Street view unavailable",
        message: "Add VITE_GOOGLE_MAPS_API_KEY to load Google Street View.",
      }
    : {
        title: isResolvingAddress ? "Locating street view" : "Street view unavailable",
        message: statusMessage,
      };

  return (
    <div
      className={`rounded-2xl border border-neutral-200 bg-white ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
          <MdOutlineStreetview size={20} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
          <p className="text-xs text-neutral-500">{subtitle}</p>
        </div>
      </div>

      <div className={`relative w-full ${heightClassName}`}>
        {hasResolvedCoordinates && hasApiKey && !loadError ? (
          <div ref={containerRef} className="h-full w-full" />
        ) : null}

        {!hasStreetView && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-50 px-5 text-center">
            <div>
              <p className="text-sm font-medium text-neutral-800">
                {overlay.title}
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                {overlay.message}
              </p>
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100"
                >
                  Open in Maps
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreetViewPanel;
