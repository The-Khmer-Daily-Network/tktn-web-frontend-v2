"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getArticles } from "@/services/article";
import { getVideos } from "@/services/video";
import type { Article } from "@/types/article";
import type { Video } from "@/types/video";
import { Play } from "lucide-react";
import SEO from "@/components/SEO";
import RevealItem from "@/components/RevealItem";

/** Unified search result: article or video, sorted by date (latest first). */
export type SearchResult = (Article | Video) & { date_time_post: string };

function isVideo(item: SearchResult): item is Video {
  return "middle_video_url" in item && item.middle_video_url != null;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageArticles, setPageArticles] = useState(1);
  const [pageVideos, setPageVideos] = useState(1);
  const [hasMoreArticles, setHasMoreArticles] = useState(true);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const dedupeAndSort = (items: SearchResult[]): SearchResult[] => {
    const seen = new Set<string>();
    const unique: SearchResult[] = [];
    for (const item of items) {
      const key = `${isVideo(item) ? "v" : "a"}-${item.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }
    unique.sort((a, b) => {
      const tA = new Date(a.date_time_post).getTime();
      const tB = new Date(b.date_time_post).getTime();
      return tB - tA; // latest first
    });
    return unique;
  };

  const fetchSearchResults = useCallback(
    async (
      searchQuery: string,
      options?: { append?: boolean; pageArticles?: number; pageVideos?: number },
    ) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setResults([]);
        setInitialLoading(false);
        setIsLoadingMore(false);
        setHasMoreArticles(false);
        setHasMoreVideos(false);
        setPageArticles(1);
        setPageVideos(1);
        return;
      }

      const targetPageArticles = options?.pageArticles ?? 1;
      const targetPageVideos = options?.pageVideos ?? 1;
      const isAppend = options?.append === true;

      try {
        if (isAppend) {
          setIsLoadingMore(true);
          setInitialLoading(false);
        } else {
          setInitialLoading(true);
          setIsLoadingMore(false);
          setHasMoreArticles(true);
          setHasMoreVideos(true);
          setPageArticles(1);
          setPageVideos(1);
          setResults([]);
        }

        setError(null);
        const searchTerm = trimmed;
        const [articlesRes, videosRes] = await Promise.all([
          getArticles(undefined, {
            per_page: 25,
            page: targetPageArticles,
            search: searchTerm,
          }),
          getVideos(undefined, {
            per_page: 20,
            page: targetPageVideos,
            search: searchTerm,
          }),
        ]);

        setPageArticles(articlesRes.meta.current_page);
        setPageVideos(videosRes.meta.current_page);
        setHasMoreArticles(
          articlesRes.meta.current_page < articlesRes.meta.last_page,
        );
        setHasMoreVideos(
          videosRes.meta.current_page < videosRes.meta.last_page,
        );

        const batch: SearchResult[] = [
          ...(articlesRes.data as SearchResult[]),
          ...(videosRes.data as SearchResult[]),
        ];

        setResults((prev) =>
          isAppend ? dedupeAndSort([...prev, ...batch]) : dedupeAndSort(batch),
        );
      } catch (err) {
        console.error("Error fetching search results:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch search results",
        );
      } finally {
        setInitialLoading(false);
        setIsLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (query) {
      fetchSearchResults(query, { append: false, pageArticles: 1, pageVideos: 1 });
    } else {
      setResults([]);
      setInitialLoading(false);
      setIsLoadingMore(false);
      setHasMoreArticles(false);
      setHasMoreVideos(false);
      setPageArticles(1);
      setPageVideos(1);
    }
  }, [query, fetchSearchResults]);

  useEffect(() => {
    if (!query) return;
    if (!sentinelRef.current) return;
    if (!hasMoreArticles && !hasMoreVideos) return;

    const el = sentinelRef.current;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first.isIntersecting &&
          !initialLoading &&
          !isLoadingMore &&
          (hasMoreArticles || hasMoreVideos)
        ) {
          const nextArticlesPage = hasMoreArticles
            ? pageArticles + 1
            : pageArticles;
          const nextVideosPage = hasMoreVideos ? pageVideos + 1 : pageVideos;
          fetchSearchResults(query, {
            append: true,
            pageArticles: nextArticlesPage,
            pageVideos: nextVideosPage,
          });
        }
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0.1,
      },
    );

    observerRef.current.observe(el);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [
    query,
    hasMoreArticles,
    hasMoreVideos,
    initialLoading,
    isLoadingMore,
    pageArticles,
    pageVideos,
    fetchSearchResults,
  ]);

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

  // Generate SEO metadata
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const currentUrl = `${baseUrl}/search${query ? `?q=${encodeURIComponent(query)}` : ""}`;

  if (initialLoading) {
    return (
      <>
        <SEO
          title={`Search Results${query ? `: ${query}` : ""} - The Khmer Today`}
          description={`Search results for "${query}" on The Khmer Today. Find news articles and stories matching your search.`}
          subtitle={`Searching for "${query}"...`}
          keywords={`search, ${query}, news, articles, The Khmer Today`}
          url={currentUrl}
        />
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600">Searching...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <SEO
          title="Search - The Khmer Today"
          description="Search for news articles on The Khmer Today."
          subtitle="Search for news and articles"
          keywords="search, news, articles, The Khmer Today"
          url={currentUrl}
        />
        <div className="flex items-center justify-center py-12">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title={`Search Results${query ? `: ${query}` : ""} - The Khmer Today`}
        description={`Search results for "${query}" on The Khmer Today. Found ${results.length} ${results.length === 1 ? "result" : "results"} matching your search.`}
        subtitle={`Found ${results.length} ${results.length === 1 ? "result" : "results"} for "${query}"`}
        keywords={`search, ${query}, news, articles, The Khmer Today`}
        url={currentUrl}
      />
      <div className="w-full space-y-6">
        {/* Search Results + Infinite scroll */}
        {!query ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-gray-600">Enter a search term above to find articles and videos by title or subtitle.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-600">
              No results found matching &quot;{query}&quot;
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((item, index) => (
                <RevealItem
                  key={`${isVideo(item) ? "v" : "a"}-${item.id}`}
                  delayMs={index * 5}
                >
                  <Link
                    href={isVideo(item) ? `/news/v-${item.id}` : `/news/${item.id}`}
                    className="flex flex-col space-y-3 cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    {/* Cover / thumbnail; for videos without cover show placeholder with play icon */}
                    <div className="relative w-full h-[200px] rounded-lg overflow-hidden bg-gray-200 group">
                      {item.cover ? (
                        <img
                          src={item.cover}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : isVideo(item) ? (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                          <Play className="w-16 h-16 text-gray-500" />
                        </div>
                      ) : null}
                      {/* Play overlay for videos (like videoDashboard) */}
                      {isVideo(item) && item.cover && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-all">
                          <div className="w-16 h-16 rounded-full bg-white/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play
                              className="w-8 h-8 text-white ml-1"
                              fill="currentColor"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col space-y-2">
                      {item.category && (
                        <span className="text-sm font-semibold text-[#085C9C]">
                          {item.category.name}
                        </span>
                      )}
                      <p className="text-xs text-[#1D2229] font-medium">
                        {formatDate(item.date_time_post)}
                      </p>
                      <h2 className="text-lg font-semibold text-gray-900 line-clamp-2 leading-tight">
                        {item.title}
                      </h2>
                      {item.subtitle && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {item.subtitle}
                        </p>
                      )}
                      {item.content_blocks &&
                        item.content_blocks.length > 0 && (
                          <p className="text-sm text-gray-700 line-clamp-3">
                            {item.content_blocks[0].paragraph}
                          </p>
                        )}
                    </div>
                  </Link>
                </RevealItem>
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1 w-full" />

            {isLoadingMore && (
              <div className="flex items-center justify-center py-6">
                <p className="text-sm text-gray-500">Loading more results...</p>
              </div>
            )}

            {!hasMoreArticles && !hasMoreVideos && results.length > 0 && (
              <div className="flex items-center justify-center py-4">
                <p className="text-xs text-gray-400">
                  You&apos;ve reached the end of the results.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <>
          <SEO
            title="Search - The Khmer Today"
            description="Search for news articles on The Khmer Today."
            subtitle="Search for news and articles"
            keywords="search, news, articles, The Khmer Today"
            url={`${typeof window !== "undefined" ? window.location.origin : ""}/search`}
          />
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        </>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
