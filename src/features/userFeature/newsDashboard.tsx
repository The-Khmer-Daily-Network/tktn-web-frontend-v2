"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getFontStyle, getFontClassName } from "@/utils/font";
// ANIMATION: uncomment to re-enable per-item reveal
import RevealItem from "@/components/RevealItem";

// --- Types ---
export interface ArticleCategory {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleDashboardItem {
  id: number;
  category_id: number | null;
  title: string;
  slug: string | null;
  cover: string | null;
  date_time_post: string;
  created_at: string;
  updated_at: string;
  first_paragraph: string | null;
  category: ArticleCategory | null;
}

// --- Component ---
interface NewsDashboardProps {
  initialData?: ArticleDashboardItem[] | null;
  loading?: boolean;
}

export default function NewsDashboard({ initialData, loading: loadingProp }: NewsDashboardProps = {}) {
  const [windowWidth, setWindowWidth] = useState<number | null>(null);
  const loading = loadingProp ?? false;
  // Single source of truth from parent to avoid duplicate data in memory
  const displayArticles = initialData ?? [];

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const formatDate = (dateString: string) => {
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
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();

    if (!Number.isFinite(diffMs)) return "";

    const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSeconds < 60) return `${diffSeconds}s ago`;

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12)
      return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;

    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
  };

  if (loading) {
    return (
      <div className="w-full space-y-6 mt-6">
        <div className="w-full">
          <div className="flex flex-col space-y-2 sm:hidden animate-pulse">
            <div
              className="relative w-full rounded-[10px] bg-gray-200"
              style={{ height: "200px" }}
            />
            <div className="flex flex-col space-y-1">
              <div className="h-4 bg-gray-200 rounded-[10px] w-20" />
              <div className="h-4 bg-gray-200 rounded-[10px] w-32" />
              <div className="h-5 bg-gray-200 rounded-[10px] w-full" />
              <div className="h-5 bg-gray-200 rounded-[10px] w-3/4" />
            </div>
          </div>
          <div className="hidden sm:flex flex-col sm:flex-row gap-4 sm:gap-6 bg-[#273C8F]/10 rounded-[10px] animate-pulse">
            <div
              className="relative rounded-[10px] bg-gray-200"
              style={{ width: "500px", height: "275px" }}
            />
            <div className="w-full sm:w-1/2 flex flex-col justify-start mt-4 space-y-6">
              <div>
                <div className="h-5 bg-gray-200 rounded-[10px] w-32 mb-2" />
                <div className="h-4 bg-gray-200 rounded-[10px] w-40" />
              </div>
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded-[10px] w-full" />
                <div className="h-6 bg-gray-200 rounded-[10px] w-5/6" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded-[10px] w-full" />
                <div className="h-4 bg-gray-200 rounded-[10px] w-full" />
                <div className="h-4 bg-gray-200 rounded-[10px] w-4/5" />
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="flex flex-row gap-3 sm:flex-col sm:space-y-0">
                <div className="relative max-[400px]:w-[150px] max-[400px]:h-[110px] w-[200px] h-[150px] sm:w-full sm:h-[140px] shrink-0 rounded-[10px] bg-gray-200" />
                <div className="flex-1 sm:flex-none flex flex-col justify-center sm:justify-start sm:space-y-1 space-y-1">
                  <div className="h-3 bg-gray-200 rounded-[10px] w-16" />
                  <div className="h-3 bg-gray-200 rounded-[10px] w-24 mb-2" />
                  <div className="h-4 bg-gray-200 rounded-[10px] w-full" />
                  <div className="h-4 bg-gray-200 rounded-[10px] w-5/6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (displayArticles.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">No news available</p>
      </div>
    );
  }

  const mainArticle = displayArticles[0];
  const otherArticles = displayArticles.slice(1, 6);
  const displayedArticles =
    windowWidth !== null && windowWidth <= 1279
      ? otherArticles.slice(0, 3)
      : otherArticles;
  const mobileMoreStartIdx = 1 + displayedArticles.length;
  const mobileMoreGridArticles =
    windowWidth !== null && windowWidth < 640
      ? displayArticles.slice(mobileMoreStartIdx, mobileMoreStartIdx + 4)
      : [];
  const mobileMoreListArticles =
    windowWidth !== null && windowWidth < 640
      ? displayArticles.slice(mobileMoreStartIdx + 4, mobileMoreStartIdx + 8)
      : [];

  return (
    <div className="w-full space-y-6">
      {mainArticle && (
        <Link href={`/news/${mainArticle.id}`} className="w-full block">
          <article className="w-full">
            <div className="cursor-pointer hover:opacity-95 transition-opacity sm:hidden">
              <div className="relative w-full rounded-lg overflow-hidden bg-gray-200">
                {/* Image */}
                {mainArticle.cover && (
                  <img
                    src={mainArticle.cover}
                    alt={mainArticle.title}
                    className="w-full h-[520px] object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/80 to-transparent" />

                {/* Text overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  {mainArticle.category && (
                    <div className="mb-2">
                      <span
                        className={`inline-block text-[12px] font-semibold tracking-wider uppercase text-white/90 ${getFontClassName(mainArticle.category.name)}`}
                        style={getFontStyle(mainArticle.category.name)}
                      >
                        {mainArticle.category.name}
                      </span>
                    </div>
                  )}

                  <h1
                    className={`text-[24px] leading-[1.15] font-extrabold text-white line-clamp-3 ${getFontClassName(mainArticle.title)}`}
                    style={getFontStyle(mainArticle.title)}
                  >
                    {mainArticle.title}
                  </h1>

                  {mainArticle.first_paragraph && (
                    <p
                      className={`mt-2 text-[14px] leading-[1.4] text-white/85 line-clamp-2 ${getFontClassName(mainArticle.first_paragraph)}`}
                      style={getFontStyle(mainArticle.first_paragraph)}
                    >
                      {mainArticle.first_paragraph}
                    </p>
                  )}

                  <p className="mt-3 text-[12px] text-white/70">
                    {formatRelativeTime(mainArticle.date_time_post)}
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex flex-col sm:flex-row gap-4 sm:gap-6 bg-[#273C8F]/10 rounded-[10px] cursor-pointer hover:opacity-90 transition-opacity">
              <div
                className="relative rounded-lg overflow-hidden bg-gray-200 group"
                style={{ width: "500px", height: "350px" }}
              >
                {mainArticle.cover && (
                  <img
                    src={mainArticle.cover}
                    alt={mainArticle.title}
                    className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
              </div>
              <div className="w-full sm:w-1/2 flex flex-col justify-start mt-4 space-y-6">
                <div>
                  {mainArticle.category && (
                    <span
                      className={`inline-block text-base font-bold text-[#1D2229] underline decoration-[#085C9C] decoration-3 underline-offset-5 uppercase ${getFontClassName(mainArticle.category.name)}`}
                      style={getFontStyle(mainArticle.category.name)}
                    >
                      {mainArticle.category.name}
                    </span>
                  )}
                  <p className="text-sm text-[#1D2229] mt-2 font-medium">
                    {formatDate(mainArticle.date_time_post)}
                  </p>
                </div>
                <div className="space-y-2">
                  <h1
                    className={`text-xl font-bold text-[#1D2229] leading-normal ${getFontClassName(mainArticle.title)}`}
                    style={getFontStyle(mainArticle.title)}
                  >
                    {mainArticle.title}
                  </h1>
                </div>
                {mainArticle.first_paragraph && (
                  <p
                    className={`text-sm text-gray-700 line-clamp-3 ${getFontClassName(mainArticle.first_paragraph)}`}
                    style={getFontStyle(mainArticle.first_paragraph)}
                  >
                    {mainArticle.first_paragraph}
                  </p>
                )}
              </div>
            </div>
          </article>
        </Link>
      )}
      {displayedArticles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          {displayedArticles.map((article, index) => (
            <RevealItem key={article.id} delayMs={index * 30}>
              <Link
                href={`/news/${article.id}`}
                className="cursor-pointer hover:opacity-90 transition-opacity"
              >
                {/* Mobile list style (CNA-like) */}
                <div className="sm:hidden flex items-center gap-4 py-4 border-b border-gray-200">
                  <div className="relative w-[128px] h-[86px] shrink-0 rounded-lg overflow-hidden bg-gray-200">
                    {article.cover && (
                      <img
                        src={article.cover}
                        alt={article.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2
                      className={`text-[16px] font-semibold text-[#111827] leading-tight line-clamp-3 ${getFontClassName(article.title)}`}
                      style={getFontStyle(article.title)}
                    >
                      {article.title}
                    </h2>
                    <p className="mt-2 text-[12px] text-gray-500">
                      {formatRelativeTime(article.date_time_post)}
                    </p>
                  </div>
                </div>

                {/* Desktop/tablet (existing) */}
                <div className="hidden sm:flex flex-row gap-3 sm:flex-col sm:space-y-0">
                  <div className="relative max-[400px]:w-[150px] max-[400px]:h-[110px] w-[200px] h-[150px] sm:w-full sm:h-[140px] shrink-0 rounded-lg overflow-hidden bg-gray-200 group">
                    {article.cover && (
                      <img
                        src={article.cover}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                  </div>
                  <div className="flex-1 sm:flex-none flex flex-col justify-center sm:justify-start sm:space-y-1 space-y-1">
                    {article.category && (
                      <span
                        className={`text-sm font-semibold text-[#1D2229] underline decoration-[#085C9C] decoration-2 underline-offset-5 uppercase ${getFontClassName(article.category.name)}`}
                        style={getFontStyle(article.category.name)}
                      >
                        {article.category.name}
                      </span>
                    )}
                    <p className="text-xs text-[#1D2229] font-regular mb-2">
                      {formatDate(article.date_time_post)}
                    </p>
                    <h2
                      className={`text-base font-semibold text-gray-900 line-clamp-2 leading-tight md:text-sm ${getFontClassName(article.title)}`}
                      style={getFontStyle(article.title)}
                    >
                      {article.title}
                    </h2>
                  </div>
                </div>
              </Link>
            </RevealItem>
          ))}
        </div>
      )}

      {/* Mobile: 4 more news (2 per row) */}
      {mobileMoreGridArticles.length > 0 && (
        <div className="sm:hidden grid grid-cols-2 gap-4 pt-2">
          {mobileMoreGridArticles.map((article) => (
            <Link
              key={article.id}
              href={`/news/${article.id}`}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div className="w-full">
                <div className="relative w-full aspect-16/10 rounded-lg overflow-hidden bg-gray-200">
                  {article.cover && (
                    <img
                      src={article.cover}
                      alt={article.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                </div>
                <h3
                  className={`mt-2 text-[16px] font-semibold text-[#111827] leading-tight line-clamp-3 ${getFontClassName(article.title)}`}
                  style={getFontStyle(article.title)}
                >
                  {article.title}
                </h3>
                <p className="mt-2 text-[12px] text-gray-500">
                  {formatRelativeTime(article.date_time_post)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Mobile: remaining items (list style) */}
      {mobileMoreListArticles.length > 0 && (
        <div className="sm:hidden">
          {mobileMoreListArticles.map((article) => (
            <Link
              key={article.id}
              href={`/news/${article.id}`}
              className="cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center gap-4 py-4 border-b border-t border-gray-200">
                <div className="relative w-[128px] h-[86px] shrink-0 rounded-lg overflow-hidden bg-gray-200">
                  {article.cover && (
                    <img
                      src={article.cover}
                      alt={article.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    className={`text-[16px] font-semibold text-[#111827] leading-tight line-clamp-3 ${getFontClassName(article.title)}`}
                    style={getFontStyle(article.title)}
                  >
                    {article.title}
                  </h3>
                  <p className="mt-2 text-[12px] text-gray-500">
                    {formatRelativeTime(article.date_time_post)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
