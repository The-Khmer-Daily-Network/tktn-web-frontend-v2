import { getApiUrl, isApiConfigured } from "@/lib/api-url";
import type {
  CategoryCreateParams,
  CategoryCreateResponse,
  CategoryDeleteResponse,
  CategoryResponse,
  CategoryUpdateParams,
  CategoryUpdateResponse,
} from "@/types/category";

if (!isApiConfigured()) {
  console.warn(
    "NEXT_PUBLIC_API_BASE_URL is not defined in environment variables",
  );
}

/** Dedupe: one in-flight request; concurrent callers (e.g. header + [slug] page) share it. */
let categoriesInFlight: Promise<CategoryResponse> | null = null;
/** Cache result so follow-up calls within 1 min don't refetch. */
let categoriesCache: { data: CategoryResponse; at: number } | null = null;
const CACHE_MS = 60_000;

/**
 * Fetch all categories with subcategories.
 * Dedupes concurrent calls (e.g. header + [slug] page) so only one request is made,
 * and caches the result for 1 min so later calls don't refetch.
 */
export async function getCategories(): Promise<CategoryResponse> {
  const now = Date.now();
  if (categoriesCache && now - categoriesCache.at < CACHE_MS) {
    return categoriesCache.data;
  }
  if (categoriesInFlight) {
    return categoriesInFlight;
  }

  const url = getApiUrl("/categories");
  categoriesInFlight = (async () => {
    try {
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
          `Failed to fetch categories: ${response.status} ${response.statusText}. ${errorText}`,
        );
      }

      const data: CategoryResponse = await response.json();
      categoriesCache = { data, at: Date.now() };
      return data;
    } catch (error) {
      console.error("[getCategories] Request failed:", { url, error });
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          `Network error: Unable to connect to API. Please check if NEXT_PUBLIC_API_BASE_URL is set correctly and the API server is running.`,
        );
      }
      throw error;
    } finally {
      categoriesInFlight = null;
    }
  })();

  return categoriesInFlight;
}

/**
 * Create a new category (main or sub category)
 */
export async function createCategory(
  params: CategoryCreateParams,
): Promise<CategoryCreateResponse> {
  try {
    const url = getApiUrl("/categories");

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
        `Failed to create category: ${response.status} ${response.statusText}. ${errorText}`,
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
 * Update a category
 */
export async function updateCategory(
  id: number,
  params: CategoryUpdateParams,
): Promise<CategoryUpdateResponse> {
  try {
    const url = getApiUrl(`/categories/${id}`);

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
        `Failed to update category: ${response.status} ${response.statusText}. ${errorText}`,
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
 * Delete a category
 */
export async function deleteCategory(
  id: number,
): Promise<CategoryDeleteResponse> {
  try {
    const url = getApiUrl(`/categories/${id}`);
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
        `Failed to delete category: ${response.status} ${response.statusText}. ${errorText}`,
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
