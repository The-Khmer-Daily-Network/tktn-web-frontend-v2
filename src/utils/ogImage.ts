/**
 * Same-origin OG image URL for Facebook / Telegram crawlers.
 * `v` changes when the cover (or article) is updated so their image cache
 * treats it as a new photo instead of keeping the previous one.
 */
export function buildArticleOgImageUrl(
  siteBase: string,
  idParam: string,
  version?: {
    cover?: string | null;
    updated_at?: string | null;
    date_time_post?: string | null;
  },
): string {
  const origin = siteBase.replace(/\/$/, "");
  const url = `${origin}/api/news/${encodeURIComponent(idParam)}/og-image`;
  const v = getOgImageVersion(version);
  return v ? `${url}?v=${encodeURIComponent(v)}` : url;
}

function getOgImageVersion(version?: {
  cover?: string | null;
  updated_at?: string | null;
  date_time_post?: string | null;
}): string {
  const updated = version?.updated_at || version?.date_time_post || "";
  const time = Date.parse(updated);
  const timePart = Number.isFinite(time) ? String(time) : "";
  const coverPart = coverToken(version?.cover);
  return [timePart, coverPart].filter(Boolean).join("-");
}

function coverToken(cover?: string | null): string {
  if (!cover) return "";
  const file = cover.split("?")[0].split("/").pop() || "";
  return file.replace(/[^a-zA-Z0-9._-]/g, "").slice(-16);
}
