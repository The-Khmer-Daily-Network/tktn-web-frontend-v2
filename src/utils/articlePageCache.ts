/**
 * ISR windows — CDN serves cached HTML; admin save + SEO revalidate hook clear stale content.
 */
export const ARTICLE_PAGE_REVALIDATE_SECONDS = 300;
export const SITEMAP_REVALIDATE_SECONDS = 3600;

export function cachedFetchInit(revalidateSeconds: number): RequestInit {
  if (process.env.NODE_ENV === "development") {
    return { cache: "no-store" };
  }
  return { next: { revalidate: revalidateSeconds } };
}

export function articlePageFetchInit(): RequestInit {
  return cachedFetchInit(ARTICLE_PAGE_REVALIDATE_SECONDS);
}

export function ogImageCacheControl(): string {
  return "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
}
