export interface ReverseGeocodeResult {
  address: string;
  city: string;
  state: string;
  country: string;
  landmark?: string;
}

export interface CurrentBrowserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error("Location lookup failed");
  }

  return response.json() as Promise<T>;
};

const resolveCity = (address: Record<string, string | undefined>) =>
  address.city ||
  address.town ||
  address.village ||
  address.municipality ||
  address.county ||
  address.suburb ||
  "";

const resolveStreetAddress = (address: Record<string, string | undefined>) => {
  const roadLine = [address.house_number, address.road].filter(Boolean).join(" ");

  if (roadLine) {
    return roadLine;
  }

  return (
    address.neighbourhood ||
    address.suburb ||
    address.quarter ||
    address.hamlet ||
    ""
  );
};

export const reverseGeocodeCoordinates = async (
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult | null> => {
  try {
    const result = await fetchJson<{
      address?: Record<string, string | undefined>;
      display_name?: string;
    }>(
      `${NOMINATIM_BASE_URL}/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`,
    );

    const address = result.address || {};
    const streetAddress = resolveStreetAddress(address);
    const city = resolveCity(address);
    const state = address.state || address.region || "";
    const country = address.country || "Nigeria";
    const landmark =
      address.attraction || address.building || address.amenity || address.shop;

    return {
      address:
        streetAddress || result.display_name?.split(",").slice(0, 2).join(",").trim() || "",
      city,
      state,
      country,
      landmark,
    };
  } catch (error) {
    console.error("Error reverse geocoding coordinates:", error);
    return null;
  }
};

export const geocodeAddress = async (
  address: string,
  city: string,
  state: string,
  country: string = "Nigeria",
): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    const query = encodeURIComponent([address, city, state, country].filter(Boolean).join(", "));
    const result = await fetchJson<
      Array<{
        lat: string;
        lon: string;
      }>
    >(
      `${NOMINATIM_BASE_URL}/search?format=jsonv2&limit=1&countrycodes=ng&q=${query}`,
    );

    if (!result.length) {
      return null;
    }

    return {
      latitude: Number(result[0].lat),
      longitude: Number(result[0].lon),
    };
  } catch (error) {
    console.error("Error geocoding address:", error);
    return null;
  }
};

export const getCurrentBrowserLocation = async (): Promise<CurrentBrowserLocation | null> => {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return null;
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      });
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  } catch (error) {
    console.error("Error getting current browser location:", error);
    return null;
  }
};
