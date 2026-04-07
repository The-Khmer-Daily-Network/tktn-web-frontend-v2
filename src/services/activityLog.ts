import { getApiUrl } from "@/lib/api-url";
import type { ActivityLogsResponse } from "@/types/activityLog";

/**
 * Fetch activity logs (GET only). Read-only; no delete in UI.
 */
export async function getActivityLogs(options?: {
  page?: number;
  per_page?: number;
}): Promise<ActivityLogsResponse> {
  const params = new URLSearchParams();
  if (options?.page != null) params.set("page", String(options.page));
  if (options?.per_page != null)
    params.set("per_page", String(options.per_page));
  const query = params.toString();
  const url = getApiUrl("/activity-logs" + (query ? `?${query}` : ""));

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "omit",
    mode: "cors",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch activity logs: ${response.statusText}`);
  }

  return response.json();
}
