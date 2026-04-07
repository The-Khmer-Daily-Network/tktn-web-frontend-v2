import { getApiUrl, isApiConfigured } from "@/lib/api-url";
import type {
  PublisherCreateParams,
  PublisherCreateResponse,
  PublisherDeleteResponse,
  PublisherResponse,
  PublisherUpdateParams,
  PublisherUpdateResponse,
} from "@/types/publisher";

if (!isApiConfigured()) {
  console.warn(
    "NEXT_PUBLIC_API_BASE_URL is not defined in environment variables",
  );
}

/**
 * Fetch all publishers
 */
export async function getPublishers(): Promise<PublisherResponse> {
  try {
    const url = getApiUrl("/publishers");
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
        `Failed to fetch publishers: ${response.status} ${response.statusText}. ${errorText}`,
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
 * Create a new publisher
 */
export async function createPublisher(
  params: PublisherCreateParams,
): Promise<PublisherCreateResponse> {
  try {
    const url = getApiUrl("/publishers");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(params),
      credentials: "omit",
      mode: "cors",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create publisher: ${response.status} ${response.statusText}. ${errorText}`,
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
 * Update a publisher
 */
export async function updatePublisher(
  id: number,
  params: PublisherUpdateParams,
): Promise<PublisherUpdateResponse> {
  try {
    const url = getApiUrl(`/publishers/${id}`);

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(params),
      credentials: "omit",
      mode: "cors",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update publisher: ${response.status} ${response.statusText}. ${errorText}`,
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
 * Delete a publisher
 */
export async function deletePublisher(
  id: number,
): Promise<PublisherDeleteResponse> {
  try {
    const url = getApiUrl(`/publishers/${id}`);
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
        `Failed to delete publisher: ${response.status} ${response.statusText}. ${errorText}`,
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
