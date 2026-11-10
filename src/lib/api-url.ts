const PROXY_PATH = "/api-proxy";

/**
 * True when either a direct API base URL is set, or same-origin proxy mode is enabled.
 */
export function isApiConfigured(): boolean {
  return (
    process.env.NEXT_PUBLIC_API_PROXY === "1" ||
    Boolean(process.env.NEXT_PUBLIC_API_BASE_URL?.trim())
  );
}

/**
 * Base URL for API calls (includes `/api` segment for direct mode, or `/api-proxy` in proxy mode).
 * When `NEXT_PUBLIC_API_PROXY=1`, the browser calls same-origin `/api-proxy/...` and Next.js rewrites
 * to the real API so CORS does not apply.
 * Server-side fetch talks to the API origin directly. Routing it back through this deployment
 * would run another function for every article render.
 */
export function getApiBaseUrl(): string {
  const useProxy = process.env.NEXT_PUBLIC_API_PROXY === "1";

  if (useProxy && typeof window !== "undefined") {
    return PROXY_PATH;
  }

  if (useProxy) {
    const upstream = (
      process.env.API_UPSTREAM_ORIGIN ?? "https://api.thekhmertoday.news"
    ).replace(/\/$/, "");
    return `${upstream}/api`;
  }

  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not defined. Set it to your API base (e.g. https://api.example.com/api), or set NEXT_PUBLIC_API_PROXY=1 to use the same-origin proxy (see next.config rewrites).",
    );
  }
  return base;
}

export { readApiJson } from "./read-api-json";

export function getApiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const apiPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${apiPath}`;
}
