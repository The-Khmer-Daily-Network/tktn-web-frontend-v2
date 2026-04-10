import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { cache } from "react";
import { getApiBaseUrl, isApiConfigured } from "@/lib/api-url";
import { getFirstSentenceFromContent } from "@/utils/article";
import { renderInlineFormatting } from "@/utils/inlineFormatting";
import ArticleJsonLd from "./ArticleJsonLd";
import NewsPageContent from "./NewsPageContent";

const SITE_BASE =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.thekhmertoday.news";

type ContentBlock = { subtitle?: string | null; paragraph?: string };
type EndImage = { url: string; name?: string | null };

type ArticleMeta = {
  title: string;
  author?: string;
  user?: { username?: string | null } | null;
  subtitle: string | null;
  cover: string | null;
  category?: { name: string } | null;
  date_time_post?: string;
  created_at?: string;
  updated_at?: string;
  middle_image_url?: string | null;
  middle_image_name?: string | null;
  middle_video_url?: string | null;
  middle_video_name?: string | null;
  content_blocks?: ContentBlock[] | null;
  end_images?: EndImage[] | null;
};

async function fetchArticleById(
  baseUrl: string,
  path: string,
): Promise<ArticleMeta | null> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

const getCachedArticle = cache(fetchArticleById);

function formatDateShort(dateString?: string) {
  if (!dateString) return "";
  // If backend sends a datetime without timezone, treat it as UTC.
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(dateString);
  const normalized = hasTimezone ? dateString : `${dateString}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Phnom_Penh",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function splitParagraphs(paragraph?: string) {
  return (paragraph || "")
    .split(/\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function normalizeVideoUrl(url?: string | null) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url.replace(/^\/+/, "")}`;
}

function toYouTubeEmbedUrl(url?: string | null) {
  const normalized = normalizeVideoUrl(url);
  if (!normalized) return null;

  const youtuBeMatch = normalized.match(/(?:youtu\.be\/)([^&\n?#]+)/);
  if (youtuBeMatch) {
    const videoId = youtuBeMatch[1].split("&")[0].split("?")[0].trim();
    return `https://www.youtube.com/embed/${videoId}`;
  }

  const watchMatch = normalized.match(/(?:youtube\.com\/watch\?v=)([^&\n?#]+)/);
  if (watchMatch) {
    const videoId = watchMatch[1].split("&")[0].split("?")[0].trim();
    return `https://www.youtube.com/embed/${videoId}`;
  }

  const embedMatch = normalized.match(/(?:youtube\.com\/embed\/)([^&\n?#]+)/);
  if (embedMatch) {
    const videoId = embedMatch[1].split("&")[0].split("?")[0].trim();
    return `https://www.youtube.com/embed/${videoId}`;
  }

  const shortsMatch = normalized.match(/(?:youtube\.com\/shorts\/)([^&\n?#]+)/);
  if (shortsMatch) {
    const videoId = shortsMatch[1].split("&")[0].split("?")[0].trim();
    return `https://www.youtube.com/embed/${videoId}`;
  }

  return normalized;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: idParam } = await params;
  if (!isApiConfigured()) {
    return {
      title: "The Khmer Today - Latest News, Articles & Videos",
      description:
        "The Khmer Today is your trusted source for the latest news, articles, and videos.",
    };
  }

  const apiBase = getApiBaseUrl();

  // Support explicit video route: /news/v-123
  const isVideoRoute = idParam.startsWith("v-");
  const numericId = isVideoRoute
    ? parseInt(idParam.slice(2), 10)
    : parseInt(idParam, 10);

  if (!isNaN(numericId)) {
    const news = isVideoRoute
      ? await getCachedArticle(apiBase, `/videos/${numericId}`)
      : await getCachedArticle(apiBase, `/articles/${numericId}`);

    if (news) {
      const siteBase = SITE_BASE;

      // Route OG image through same-domain endpoint for crawler compatibility (Telegram-safe).
      const imageUrl = `${siteBase}/api/news/${idParam}/og-image`;

      const title = `${news.title} - The Khmer Today`;
      const descriptionFallback =
        getFirstSentenceFromContent(news.content_blocks) || news.title;
      const description = news.subtitle || descriptionFallback;
      const url = `${siteBase}/news/${isVideoRoute ? `v-${numericId}` : numericId}`;

      // Include title + description so search terms matching either can surface this URL
      const keywords = [
        news.title,
        news.subtitle || descriptionFallback,
        news.category?.name || "",
        "The Khmer Today",
        "Cambodia news",
        "Khmer news",
        "news articles",
      ]
        .filter(Boolean)
        .join(", ");

      // Use absolute title so root layout template doesn't add " | The Khmer Today" again
      return {
        title: { absolute: title },
        description,
        keywords,
        authors: [{ name: news.author || "The Khmer Today" }],
        openGraph: {
          type: "article",
          locale: "en_US",
          title,
          description,
          url,
          siteName: "The Khmer Today",
          images: [
            {
              url: imageUrl,
              width: 1200,
              height: 630,
              alt: news.title,
            },
          ],
          publishedTime: news.date_time_post || news.created_at,
          modifiedTime:
            news.updated_at || news.date_time_post || news.created_at,
          authors: [news.author || "The Khmer Today"],
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [imageUrl],
        },
        alternates: {
          canonical: url,
        },
      };
    }
  }

  // Default metadata for non-news pages
  return {
    title: "The Khmer Today - Latest News, Articles & Videos",
    description:
      "The Khmer Today is your trusted source for the latest news, articles, and videos.",
    openGraph: {
      type: "website",
      siteName: "The Khmer Today",
      images: [
        {
          url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.thekhmertoday.news"}/assets/TKDN_Logo/TKTN_Logo_Square.png`,
          width: 1200,
          height: 1200,
          alt: "The Khmer Today Logo",
        },
      ],
    },
  };
}

export default async function NewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;

  // If the route is numeric (/news/123 or /news/v-123) we SSR the article so Google sees the H1 + body in HTML.
  if (isApiConfigured()) {
    const apiBase = getApiBaseUrl();
    const isVideoRoute = idParam.startsWith("v-");
    const numericId = isVideoRoute
      ? parseInt(idParam.slice(2), 10)
      : parseInt(idParam, 10);

    if (!isNaN(numericId)) {
      const news = isVideoRoute
        ? await getCachedArticle(apiBase, `/videos/${numericId}`)
        : await getCachedArticle(apiBase, `/articles/${numericId}`);

      if (!news) notFound();

      let imageUrl = `${SITE_BASE}/assets/TKDN_Logo/TKTN_Logo_Square.png`;
      if (news.cover) {
        if (news.cover.startsWith("http")) imageUrl = news.cover;
        else
          imageUrl = news.cover.startsWith("/")
            ? `${SITE_BASE}${news.cover}`
            : `${SITE_BASE}/${news.cover}`;
      }

      const published = news.date_time_post || news.created_at;

      return (
        <>
          <ArticleJsonLd
            news={news}
            numericId={numericId}
            isVideoRoute={isVideoRoute}
            siteBase={SITE_BASE}
            imageUrl={imageUrl}
          />

          <article className="w-full max-w-4xl mx-auto space-y-6 mt-6">
            {/* Minimal server-rendered header (SEO-critical) */}
            <header className="space-y-3">
              <div className="flex items-stretch gap-3">
                <div className="w-1 min-h-12 rounded-[10px] bg-[#085c9c] self-stretch shrink-0" />
                <div className="flex flex-col">
                  {news.category?.name && (
                    <p className="text-base font-bold text-[#1D2229]">
                      {news.category.name}
                    </p>
                  )}
                  {published && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-600">
                        {formatDateShort(published)}
                      </span>
                      <span className="text-xs text-gray-500"></span>
                      {(news.user?.username ||
                        news.author ||
                        "The Khmer Today") && (
                        <span className="hidden md:inline text-sm text-gray-600">
                          {news.user?.username ||
                            news.author ||
                            "The Khmer Today"}
                        </span>
                      )}
                    </div>
                  )}
                  {(news.user?.username ||
                    news.author ||
                    "The Khmer Today") && (
                    <span className="text-sm text-gray-600 md:hidden">
                      {news.user?.username || news.author || "The Khmer Today"}
                    </span>
                  )}
                </div>
              </div>

              {/* H1 is SSR now */}
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#1D2229] leading-relaxed">
                {news.title}
              </h1>

              {news.subtitle && (
                <p className="text-lg text-gray-700">{news.subtitle}</p>
              )}
            </header>

            {news.cover && (
              <figure className="w-full">
                <img
                  src={news.cover}
                  alt={news.title}
                  className="w-full h-auto object-cover rounded-lg"
                />
              </figure>
            )}

            {/* SSR article body so Google can index it */}
            {Array.isArray(news.content_blocks) &&
              news.content_blocks.length > 0 && (
                <div className="space-y-8 wrap-anywhere [&_a]:wrap-anywhere">
                  {news.content_blocks.map((block, idx) => (
                    <section key={idx} className="space-y-4">
                      {block.subtitle && (
                        <h2 className="text-2xl font-bold text-[#1D2229]">
                          {block.subtitle}
                        </h2>
                      )}
                      {splitParagraphs(block.paragraph).map((p, pIdx) => (
                        <p
                          key={pIdx}
                          className="text-base text-gray-800 leading-relaxed wrap-anywhere"
                        >
                          {renderInlineFormatting(p)}
                        </p>
                      ))}
                    </section>
                  ))}
                </div>
              )}

            {/* Middle Video/Image (SSR) */}
            {news.middle_video_url ? (
              <div className="w-full my-8">
                <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <iframe
                    src={toYouTubeEmbedUrl(news.middle_video_url) || undefined}
                    title={news.middle_video_name || news.title}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                {news.middle_video_name && (
                  <p className="text-sm text-gray-600 mt-2 italic">
                    {news.middle_video_name}
                  </p>
                )}
              </div>
            ) : news.middle_image_url ? (
              <figure className="w-full my-8">
                <img
                  src={news.middle_image_url}
                  alt={news.middle_image_name || news.title}
                  className="w-full h-auto object-cover rounded-lg"
                />
                {news.middle_image_name && (
                  <figcaption className="text-sm text-gray-600 mt-2 italic">
                    {news.middle_image_name}
                  </figcaption>
                )}
              </figure>
            ) : null}

            {/* End Images (restored) */}
            {Array.isArray(news.end_images) && news.end_images.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                {news.end_images.map((endImage, index) => (
                  <figure key={index} className="w-full">
                    <img
                      src={endImage.url}
                      alt={endImage.name || `End image ${index + 1}`}
                      className="w-full h-auto object-cover rounded-lg"
                    />
                    {endImage.name && (
                      <figcaption className="text-sm text-gray-600 mt-2 italic">
                        {endImage.name}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}
          </article>
        </>
      );
    }
  }

  // Non-numeric routes (/news/latest, /news/video, /news/national, etc.) remain client-driven.
  return <NewsPageContent />;
}
