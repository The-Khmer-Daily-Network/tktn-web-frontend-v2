import { getApiUrl, isApiConfigured } from "@/lib/api-url";
import type { SocialMediaResponse } from "@/types/socialMedia";

if (!isApiConfigured()) {
  console.warn(
    "NEXT_PUBLIC_API_BASE_URL is not defined in environment variables",
  );
}

/**
 * Fetch all social media links
 */
export async function getSocialMedia(): Promise<SocialMediaResponse> {
  try {
    const url = getApiUrl("/social-media");
    console.log("Fetching from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "omit",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch social media: ${response.status} ${response.statusText}. ${errorText}`,
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching social media:", error);
    throw error;
  }
}
