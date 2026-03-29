const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
  created_at: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload a single image or PDF to Cloudinary.
 */
export const uploadFile = async (
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> => {
  try {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      throw new Error(
        "Cloudinary configuration missing.",
      );
    }

    const isSupportedFile =
      file.type.startsWith("image/") ||
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isSupportedFile) {
      throw new Error("Only image and PDF uploads are supported.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "billboards");

    const xhr = new XMLHttpRequest();
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

    return new Promise((resolve, reject) => {
      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            });
          }
        });
      }

      // Handle completion
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          const response: CloudinaryUploadResponse = JSON.parse(
            xhr.responseText,
          );
          resolve(response.secure_url);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload aborted"));
      });

      // Send request
      xhr.open("POST", uploadUrl);
      xhr.send(formData);
    });
  } catch (error) {
    console.error("Error uploading file to Cloudinary:", error);
    throw new Error("Failed to upload file");
  }
};

export const uploadImage = async (
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> => {
  return uploadFile(file, onProgress);
};

/**
 * Upload multiple images or PDFs to Cloudinary.
 */
export const uploadFiles = async (
  files: File[],
  onProgress?: (fileIndex: number, progress: UploadProgress) => void,
): Promise<string[]> => {
  try {
    const uploadedUrls: string[] = [];

    // Upload sequentially to avoid memory spikes on low-memory devices.
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const url = await uploadFile(file, (progress) => {
        if (onProgress) {
          onProgress(index, progress);
        }
      });
      uploadedUrls.push(url);
    }

    return uploadedUrls;
  } catch (error) {
    console.error("Error uploading files to Cloudinary:", error);
    throw new Error("Failed to upload files");
  }
};

export const uploadImages = async (
  files: File[],
  onProgress?: (fileIndex: number, progress: UploadProgress) => void,
): Promise<string[]> => {
  return uploadFiles(files, onProgress);
};

export const deleteImage = async (publicId: string): Promise<void> => {
  console.warn(
    "Image deletion requires backend implementation for security. Public ID:",
    publicId,
  );
};
