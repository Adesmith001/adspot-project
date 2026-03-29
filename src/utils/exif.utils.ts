import exifr from "exifr";

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Extract GPS coordinates from a single image file's EXIF metadata.
 * Returns null if no GPS data is found.
 */
export const extractGpsFromFile = async (
  file: File,
): Promise<GpsCoordinates | null> => {
  try {
    const gps = await exifr.gps(file);
    if (
      gps &&
      typeof gps.latitude === "number" &&
      typeof gps.longitude === "number"
    ) {
      return { latitude: gps.latitude, longitude: gps.longitude };
    }

    const metadata = await exifr.parse(file, {
      gps: true,
      exif: true,
      tiff: true,
      xmp: true,
      pick: [
        "latitude",
        "longitude",
        "lat",
        "lng",
        "GPSLatitude",
        "GPSLongitude",
      ],
    });

    const latitudeCandidates = [
      metadata?.latitude,
      metadata?.lat,
      metadata?.GPSLatitude,
    ];
    const longitudeCandidates = [
      metadata?.longitude,
      metadata?.lng,
      metadata?.GPSLongitude,
    ];

    const latitude = latitudeCandidates.find(
      (value) => typeof value === "number"
    );
    const longitude = longitudeCandidates.find(
      (value) => typeof value === "number"
    );

    if (typeof latitude === "number" && typeof longitude === "number") {
      return { latitude, longitude };
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Extract GPS coordinates from multiple files.
 * Returns the first valid GPS hit, or null if none found.
 */
export const extractGpsFromFiles = async (
  files: File[],
): Promise<GpsCoordinates | null> => {
  for (const file of files) {
    const coords = await extractGpsFromFile(file);
    if (coords) return coords;
  }
  return null;
};
