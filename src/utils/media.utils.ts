export const isPdfFile = (file: File): boolean => {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
};

export const isPdfUrl = (url: string): boolean => {
  return /\.pdf(?:$|[?#])/i.test(url);
};

export const getAssetLabelFromUrl = (url: string): string => {
  try {
    const decodedUrl = decodeURIComponent(url);
    const parts = decodedUrl.split("/");
    const lastPart = parts[parts.length - 1] || "asset";
    return lastPart.split("?")[0];
  } catch {
    return "asset";
  }
};