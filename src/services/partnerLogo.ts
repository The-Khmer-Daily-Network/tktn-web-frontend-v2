import { getApiUrl, isApiConfigured } from "@/lib/api-url";
import type {
  PartnerLogoImageDeleteResponse,
  PartnerLogoImageResponse,
  PartnerLogoImageUploadParams,
  PartnerLogoImageUploadResponse,
} from "@/types/partnerLogo";

if (!isApiConfigured()) {
  console.warn(
    "NEXT_PUBLIC_API_BASE_URL is not defined in environment variables",
  );
}

/**
 * Fetch all partner logo images
 */
export async function getPartnerLogos(): Promise<PartnerLogoImageResponse> {
  try {
    const url = getApiUrl("/partner-logo-images");
    console.log("Fetching from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "omit",
      mode: "cors",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch partner logos: ${response.status} ${response.statusText}. ${errorText}`,
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        `Network error: Unable to connect to API. Please check if NEXT_PUBLIC_API_BASE_URL is set correctly and the API server is running.`,
      );
    }
    throw error;
  }
}

/**
 * Upload partner logo image(s)
 */
export async function uploadPartnerLogo(
  image: File,
  name?: string,
): Promise<PartnerLogoImageUploadResponse> {
  try {
    const url = getApiUrl("/partner-logo-images");

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(image.type)) {
      throw new Error("Only JPG, PNG, GIF, and WebP files are allowed");
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (image.size > maxSize) {
      throw new Error("File size must be less than 2MB");
    }

    // Create FormData
    const formData = new FormData();
    formData.append("image[0]", image);

    // Add name if provided
    if (name && name.trim()) {
      formData.append("name", name.trim());
    }

    const response = await fetch(url, {
      method: "POST",
      body: formData,
      // Don't set Content-Type header, browser will set it with boundary for FormData
      credentials: "omit",
      mode: "cors",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to upload image: ${response.status} ${response.statusText}. ${errorText}`,
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        `Network error: Unable to connect to API. Please check if NEXT_PUBLIC_API_BASE_URL is set correctly and the API server is running.`,
      );
    }
    throw error;
  }
}

/**
 * Delete a partner logo image
 */
export async function deletePartnerLogo(
  id: number,
): Promise<PartnerLogoImageDeleteResponse> {
  try {
    const url = getApiUrl(`/partner-logo-images/${id}`);
    console.log("Deleting from:", url);

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "omit",
      mode: "cors",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to delete partner logo: ${response.status} ${response.statusText}. ${errorText}`,
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        `Network error: Unable to connect to API. Please check if NEXT_PUBLIC_API_BASE_URL is set correctly and the API server is running.`,
      );
    }
    throw error;
  }
}
