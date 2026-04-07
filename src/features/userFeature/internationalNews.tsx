"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getFontStyle, getFontClassName } from "@/utils/font";

// --- Types ---
export interface ContentBlock {
  subtitle: string | null;
  paragraph: string;
}

export interface InternationalNewsCategory {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface InternationalNewsItem {
  id: number;
  category_id: number | null;
  title: string;
  slug: string | null;
  cover: string | null;
  date_time_post: string;
  created_at: string;
  updated_at: string;
  first_paragraph?: string | null;
  content_blocks?: ContentBlock[];
  category: InternationalNewsCategory | null;
}

// --- Component ---
interface InternationalNewsProps {
  initialData?: InternationalNewsItem[] | null;
  loading?: boolean;
}

export default function InternationalNews({ initialData, loading: loadingProp }: InternationalNewsProps = {}) {
  const loading = loadingProp ?? false;
  const displayArticles = initialData ?? [];
  const featuredArticle = displayArticles[0];
  const smallNewsArticles = displayArticles.slice(1);
  const mobileTopFive = displayArticles.slice(0, 5);
  const mobileRemainder = displayArticles.slice(5);
  const mobileRemainderFirstFour = mobileRemainder.slice(0, 4);
  const mobileRemainderLastSix = mobileRemainder.slice(4, 10);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString("en-US", { month: "long" });
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${day} ${month} ${year} ${displayHour}:${displayMinutes}${period}`;
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
    if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;

    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
  };

  const getExcerpt = (article: InternationalNewsItem) =>
    article.first_paragraph ?? article.content_blocks?.[0]?.paragraph ?? null;

  // Mobile carousel for first 5 items
  const mixScrollRef = useRef<HTMLDivElement | null>(null);
  const [mixActiveIndex, setMixActiveIndex] = useState(0);
  const lastMixInteractAtRef = useRef<number>(Date.now());
  const mixActiveIndexRef = useRef(0);
  const topFiveLenRef = useRef(mobileTopFive.length);

  useEffect(() => {
    topFiveLenRef.current = mobileTopFive.length;
    setMixActiveIndex(0);
    mixActiveIndexRef.current = 0;
    if (mixScrollRef.current) mixScrollRef.current.scrollLeft = 0;
  }, [mobileTopFive.length]);

  useEffect(() => {
    if (mobileTopFive.length <= 1) return;

    const id = window.setInterval(() => {
      const now = Date.now();
      if (now - lastMixInteractAtRef.current < 2000) return;
      const len = topFiveLenRef.current;
      if (len <= 1) return;
      const next = (mixActiveIndexRef.current + 1) % len;
      const el = mixScrollRef.current;
      if (!el) return;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
      mixActiveIndexRef.current = next;
    }, 2000);

    return () => window.clearInterval(id);
  }, [mobileTopFive.length]);

  const scrollToMixIndex = (idx: number) => {
    const el = mixScrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(idx, mobileTopFive.length - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="h-7 bg-gray-200 rounded-xl w-56 mb-4 animate-pulse" />
        {/* Big news hero skeleton */}
        <div className="flex flex-col lg:flex-row lg:gap-6 gap-4 mb-6">
          <div className="lg:flex-2 aspect-16/10 lg:aspect-auto lg:min-h-[280px] rounded-xl bg-gray-200 animate-pulse" />
          <div className="lg:flex-1 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-20 h-20 shrink-0 rounded-xl bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-16" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Small news grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-28 h-24 shrink-0 rounded-xl bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-14" />
                <div className="h-4 bg-gray-200 rounded w-full" />
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
        <p className="text-gray-600">No international news available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2
        className={`hidden sm:block text-xl md:text-2xl font-bold text-[#085C9C] mb-4 lg:mb-5 ${getFontClassName("International News")}`}
        style={getFontStyle("International News")}
      >
        International News
      </h2>

      {/* Mobile (New Yorker-ish) layout */}
      <div className="sm:hidden mb-6">
        {/* First 5 carousel */}
        {mobileTopFive.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden mb-4">
            <div className="px-4 pt-5 pb-3">
              <div className="text-center">
                <div
                  className={`text-[18px] font-semibold tracking-[0.18em] text-[#1D2229] ${getFontClassName("INTERNATIONAL NEWS")}`}
                  style={getFontStyle("INTERNATIONAL NEWS")}
                >
                  INTERNATIONAL NEWS
                </div>
                <div className="mx-auto mt-3 h-px w-16 bg-gray-300" />
              </div>
            </div>

            <div
              ref={mixScrollRef}
              className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onTouchStart={() => {
                lastMixInteractAtRef.current = Date.now();
              }}
              onMouseDown={() => {
                lastMixInteractAtRef.current = Date.now();
              }}
              onWheel={() => {
                lastMixInteractAtRef.current = Date.now();
              }}
              onScroll={(e) => {
                lastMixInteractAtRef.current = Date.now();
                const el = e.currentTarget;
                const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
                const clamped = Math.max(0, Math.min(idx, mobileTopFive.length - 1));
                if (clamped !== mixActiveIndexRef.current) {
                  mixActiveIndexRef.current = clamped;
                  setMixActiveIndex(clamped);
                }
              }}
            >
              {mobileTopFive.map((item) => (
                <div key={item.id} className="min-w-full snap-start px-4 pb-5">
                  <Link href={`/news/${item.id}`} className="block">
                    <div className="relative w-full aspect-16/10 rounded-2xl overflow-hidden bg-gray-200">
                      {item.cover && (
                        <img
                          src={item.cover}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="eager"
                          decoding="async"
                          onError={(ev) => {
                            (ev.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                    </div>

                    <div className="mt-4">
                      <h3
                        className={`text-[22px] leading-[1.15] font-bold text-[#111827] ${getFontClassName(item.title)}`}
                        style={getFontStyle(item.title)}
                      >
                        {item.title}
                      </h3>
                      {getExcerpt(item) && (
                        <p
                          className={`mt-3 text-[15px] leading-[1.45] text-gray-600 line-clamp-3 ${getFontClassName(
                            getExcerpt(item)!,
                          )}`}
                          style={getFontStyle(getExcerpt(item)!)}
                        >
                          {getExcerpt(item)}
                        </p>
                      )}
                      <p className="mt-3 text-[12px] text-gray-500">
                        {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>

            <div className="px-4 pb-4">
              <div className="flex items-center justify-center gap-2">
                {mobileTopFive.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Go to item ${idx + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      idx === mixActiveIndex ? "w-6 bg-gray-900" : "w-2 bg-gray-300"
                    }`}
                    onClick={() => scrollToMixIndex(idx)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Remaining 10: first 4 one-column, image on right */}
        {mobileRemainderFirstFour.length > 0 && (
          <div className="border-gray-200">
            {mobileRemainderFirstFour.map((article) => (
              <Link
                key={article.id}
                href={`/news/${article.id}`}
                className="flex items-center gap-4 py-4 border-b border-gray-200 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <h4
                    className={`text-[16px] font-semibold text-[#111827] leading-tight line-clamp-3 ${getFontClassName(article.title)}`}
                    style={getFontStyle(article.title)}
                  >
                    {article.title}
                  </h4>
                  <p className="mt-2 text-[12px] text-gray-500">
                    {formatRelativeTime(article.created_at)}
                  </p>
                </div>
                <div className="relative w-[128px] h-[86px] shrink-0 rounded-xl overflow-hidden bg-gray-200">
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
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Tablet/Desktop layout */}
      <div className="hidden sm:flex flex-col lg:flex-row lg:gap-6 gap-5 mb-6 lg:mb-8">
        {/* Big news hero */}
        <Link
          href={`/news/${featuredArticle.id}`}
          className="lg:flex-2 flex flex-col cursor-pointer hover:opacity-95 transition-opacity group min-w-0"
        >
          <div className="relative w-full aspect-16/10 lg:min-h-[280px] rounded-xl overflow-hidden bg-gray-200">
            {featuredArticle.cover && (
              <img
                src={featuredArticle.cover}
                alt={featuredArticle.title}
                className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105 rounded-xl"
                loading="eager"
                decoding="async"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>
          <div className="mt-3 flex flex-col">
            <h3
              className={`mt-1 text-lg sm:text-xl md:text-2xl font-bold text-gray-900 line-clamp-3 leading-snug ${getFontClassName(featuredArticle.title)}`}
              style={getFontStyle(featuredArticle.title)}
            >
              {featuredArticle.title}
            </h3>
            <p className="mt-1 text-xs md:text-sm text-gray-500">
              {formatRelativeTime(featuredArticle.created_at)}
            </p>
          </div>
        </Link>

        {/* Small news list (4 items), title left image right */}
        {smallNewsArticles.length > 0 && (
          <div className="lg:flex-1 flex flex-col gap-3 lg:gap-4 lg:min-w-0">
            {smallNewsArticles.slice(0, 4).map((article) => (
              <Link
                key={article.id}
                href={`/news/${article.id}`}
                className="flex flex-row gap-4 cursor-pointer hover:opacity-90 transition-opacity min-w-0 border-b border-gray-200 last:border-b-0 py-4 last:pb-0"
              >
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <h4
                    className={`text-[16px] font-semibold text-[#111827] leading-tight line-clamp-3 ${getFontClassName(article.title)}`}
                    style={getFontStyle(article.title)}
                  >
                    {article.title}
                  </h4>
                  <p className="mt-2 text-[12px] text-gray-500">
                    {formatRelativeTime(article.created_at)}
                  </p>
                </div>
                <div className="relative w-[128px] h-[86px] shrink-0 rounded-xl overflow-hidden bg-gray-200 group">
                  {article.cover && (
                    <img
                      src={article.cover}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* More small news */}
      {mobileRemainderLastSix.length > 0 && (
        <>
          {/* Mobile: remaining last 6 in 2-column cards */}
          <div className="sm:hidden grid grid-cols-2 gap-4">
            {mobileRemainderLastSix.map((article) => (
              <Link
                key={article.id}
                href={`/news/${article.id}`}
                className="block cursor-pointer hover:opacity-90 transition-opacity"
              >
                <div className="relative w-full aspect-16/10 rounded-xl overflow-hidden bg-gray-200">
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
                <h4
                  className={`mt-2 text-[16px] font-semibold text-[#111827] leading-tight line-clamp-3 ${getFontClassName(article.title)}`}
                  style={getFontStyle(article.title)}
                >
                  {article.title}
                </h4>
                <p className="mt-2 text-xs text-gray-500">
                  {formatRelativeTime(article.created_at)}
                </p>
              </Link>
            ))}
          </div>

          {/* Tablet/Desktop: 2-col row layout */}
          <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 divide-y md:divide-y-0 divide-gray-200">
            {smallNewsArticles.slice(4).map((article) => (
              <Link
                key={article.id}
                href={`/news/${article.id}`}
                className="flex flex-row gap-3 md:gap-4 cursor-pointer hover:opacity-90 transition-opacity pt-4 md:pt-0 min-w-0 first:pt-0"
              >
                <div className="relative w-[120px] min-[400px]:w-[140px] md:w-[160px] h-[90px] sm:h-[100px] md:h-[110px] shrink-0 rounded-xl overflow-hidden bg-gray-200 group">
                  {article.cover && (
                    <img
                      src={article.cover}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105 rounded-xl"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-center space-y-1 min-w-0">
                  <p className="text-xs text-gray-500">
                    {formatRelativeTime(article.created_at)}
                  </p>
                  <h4
                    className={`text-sm md:text-base font-bold text-gray-900 line-clamp-2 leading-snug ${getFontClassName(article.title)}`}
                    style={getFontStyle(article.title)}
                  >
                    {article.title}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
