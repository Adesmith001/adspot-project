import React, { useEffect, useRef } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";

interface GoogleMapInteractiveProps {
  latitude?: number;
  longitude?: number;
  defaultCenter?: [number, number];
  onLocationChange?: (lat: number, lng: number) => void;
  heightClassName?: string;
  readOnly?: boolean;
}

const GoogleMapInteractive: React.FC<GoogleMapInteractiveProps> = ({
  latitude,
  longitude,
  defaultCenter = [6.5244, 3.3792],
  onLocationChange,
  heightClassName = "h-[350px]",
  readOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const { isLoaded, loadError, hasApiKey } = useGoogleMaps();

  useEffect(() => {
    if (!hasApiKey || !isLoaded || !containerRef.current) return;

    const googleMaps = window.google.maps;
    const center =
      latitude !== undefined && longitude !== undefined
        ? { lat: latitude, lng: longitude }
        : { lat: defaultCenter[0], lng: defaultCenter[1] };

    if (!mapRef.current) {
      mapRef.current = new googleMaps.Map(containerRef.current, {
        center,
        zoom: latitude !== undefined ? 16 : 11,
        fullscreenControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        gestureHandling: readOnly ? "none" : "auto",
        zoomControl: !readOnly,
      });

      if (!readOnly && onLocationChange) {
        mapRef.current.addListener("click", (event: any) => {
          onLocationChange(event.latLng.lat(), event.latLng.lng());
        });
      }
    } else {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(latitude !== undefined ? 16 : 11);
    }

    if (latitude !== undefined && longitude !== undefined) {
      if (!markerRef.current) {
        markerRef.current = new googleMaps.Marker({
          position: center,
          map: mapRef.current,
          draggable: !readOnly,
          animation: googleMaps.Animation.DROP,
        });

        if (!readOnly && onLocationChange) {
          markerRef.current.addListener("dragend", (event: any) => {
            onLocationChange(event.latLng.lat(), event.latLng.lng());
          });
        }
      } else {
        markerRef.current.setPosition(center);
        markerRef.current.setDraggable(!readOnly);
      }
    } else if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  }, [
    defaultCenter,
    hasApiKey,
    isLoaded,
    latitude,
    longitude,
    onLocationChange,
    readOnly,
  ]);

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

export default GoogleMapInteractive;
