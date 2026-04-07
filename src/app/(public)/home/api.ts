import type { InternationalNewsItem } from "@/features/userFeature/internationalNews";
import type { NationalNewsItem } from "@/features/userFeature/nationalNews";
import type { ArticleDashboardItem } from "@/features/userFeature/newsDashboard";
import type { VideoNewsItem } from "@/features/userFeature/videoNews";
import { getApiUrl } from "@/lib/api-url";

export interface HomePageData {
  dashboard: ArticleDashboardItem[];
  national: NationalNewsItem[];
  international: InternationalNewsItem[];
  videos: VideoNewsItem[];
}

export interface HomePageResponse {
  success: boolean;
  data: HomePageData;
}

/**
 * Single request for all homepage sections. Use this instead of 4 separate calls
 * to reduce round trips and re-renders.
 */
export async function getHomePageData(): Promise<HomePageResponse> {
  const url = getApiUrl("/home");
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "omit",
    mode: "cors",
    // Next.js: cache for 60s when used from server (e.g. SSR). Client fetches ignore this.
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch home data: ${response.status} ${response.statusText}. ${errorText}`,
    );
  }

  return response.json();
}
