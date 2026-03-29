import { type Libraries, useJsApiLoader } from "@react-google-maps/api";

const GOOGLE_MAPS_LIBRARIES: Libraries = [];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export const useGoogleMaps = () => {
  const loader = useJsApiLoader({
    id: "adspot-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
    version: "weekly",
    preventGoogleFontsLoading: true,
  });

  return {
    ...loader,
    hasApiKey: Boolean(GOOGLE_MAPS_API_KEY),
  };
};
