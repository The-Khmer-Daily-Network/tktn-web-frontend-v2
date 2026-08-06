/**
 * Turn API media paths into browser-loadable URLs.
 * Production stores full DigitalOcean Spaces URLs; local/dev may return
 * relative paths like `/content/images-content/foo.jpg`.
 */
const DEFAULT_MEDIA_CDN =
  process.env.NEXT_PUBLIC_MEDIA_CDN_URL?.replace(/\/$/, "") ??
  "https://the-khmer-today.sgp1.digitaloceanspaces.com";

function apiOrigin(): string | null {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!base) return null;
  return base.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return "";

  const normalized = url.replace(/\\\//g, "/").trim();
  if (!normalized) return "";

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  const path = normalized.startsWith("/") ? normalized.slice(1) : normalized;

  // Prefer CDN for content library paths (matches production storage layout).
  if (path.startsWith("content/")) {
    return `${DEFAULT_MEDIA_CDN}/${path}`;
  }

  const origin = apiOrigin();
  if (origin) {
    return `${origin}/${path}`;
  }

  return `${DEFAULT_MEDIA_CDN}/${path}`;
}

export function resolveMediaUrlOptional(
  url?: string | null,
): string | null {
  const resolved = resolveMediaUrl(url);
  return resolved || null;
}
