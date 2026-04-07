"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getNews } from "@/services/news";
import { getArticles } from "@/services/article";
import { getVideos } from "@/services/video";
import { getCategories } from "@/services/category";
import { categoryNameToSlug } from "@/utils/slug";
import type { News } from "@/types/news";
import type { Article } from "@/types/article";
import type { Video } from "@/types/video";
import type { Category } from "@/types/category";
import { FileText, Play } from "lucide-react";
import SEO from "@/components/SEO";
import BannerSponsor from "@/features/sponsor/bannerSponsor";
import RevealItem from "@/components/RevealItem";
import { getFontStyle, getFontClassName } from "@/utils/font";

/** Unified latest result: article or video, sorted by date (latest first). */
type LatestResult = (Article | Video) & { date_time_post: string };

function isVideoItem(item: LatestResult): item is Video {
  return "middle_video_url" in item && item.middle_video_url != null;
}

export default function CategoryPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [news, setNews] = useState<(Article | News)[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Latest page only: articles + videos merged, infinite scroll (same as search)
  const [latestResults, setLatestResults] = useState<LatestResult[]>([]);
  const [latestLoadingMore, setLatestLoadingMore] = useState(false);
  const [latestPageArticles, setLatestPageArticles] = useState(1);
  const [latestPageVideos, setLatestPageVideos] = useState(1);
  const [latestHasMoreArticles, setLatestHasMoreArticles] = useState(true);
  const [latestHasMoreVideos, setLatestHasMoreVideos] = useState(true);
  const latestSentinelRef = useRef<HTMLDivElement | null>(null);
  const latestObserverRef = useRef<IntersectionObserver | null>(null);

  // Category pages (national, technology, business, etc.): articles + videos, same as latest
  const [categoryResults, setCategoryResults] = useState<LatestResult[]>([]);
  const [categoryLoadingMore, setCategoryLoadingMore] = useState(false);
  const [categoryPageArticles, setCategoryPageArticles] = useState(1);
  const [categoryPageVideos, setCategoryPageVideos] = useState(1);
  const [categoryHasMoreArticles, setCategoryHasMoreArticles] = useState(true);
  const [categoryHasMoreVideos, setCategoryHasMoreVideos] = useState(true);
  const categorySentinelRef = useRef<HTMLDivElement | null>(null);
  const categoryObserverRef = useRef<IntersectionObserver | null>(null);
  const categoryLoadMoreStartIndexRef = useRef(0);
  const categoryFirstNewItemRef = useRef<HTMLDivElement | null>(null);
  const prevCategoryLoadingMoreRef = useRef(false);

  useEffect(() => {
    if (slug) {
      fetchCategoryData();
    }
  }, [slug]);

  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const slugLower = slug.toLowerCase().trim();

      // Check if it's the "latest" route (not a category): articles + videos, same as search
      if (slugLower === "latest") {
        setCategory(null);
        await fetchLatestResults(1, 1, false);
        return;
      }

      // Check if it's the "video" route (not a category)
      if (slugLower === "video") {
        // Fetch all news with video URL
        await fetchVideoNews();
        return;
      }

      const response = await getCategories();

      // Find category by matching slug
      let foundCategory: Category | null = null;

      // Search through main categories first
      for (const cat of response.categories) {
        const catSlug = categoryNameToSlug(cat.name).toLowerCase();
        const catNameLower = cat.name.toLowerCase().trim();

        if (catSlug === slugLower || catNameLower === slugLower) {
          // Found main category - will include all subcategories via backend
          foundCategory = cat;
          break;
        }

        // Check subcategories
        for (const subcat of cat.subcategories) {
          const subcatSlug = categoryNameToSlug(subcat.name).toLowerCase();
          const subcatNameLower = subcat.name.toLowerCase().trim();

          if (subcatSlug === slugLower || subcatNameLower === slugLower) {
            // Found subcategory - will show only this subcategory via backend
            foundCategory = {
              id: subcat.id,
              name: subcat.name,
              parent_id: subcat.parent_id,
              subcategories: [], // Empty array indicates it's a subcategory
            };
            break;
          }
        }
        if (foundCategory) break;
      }

      if (foundCategory) {
        setCategory(foundCategory);
        // Same as latest: articles + videos by category, 25/20 per page, infinite scroll
        await fetchCategoryMergedResults(foundCategory.id, 1, 1, false);
      } else {
        setError("Category not found");
        setLoading(false);
      }
    } catch (err) {
      console.error("Error fetching category:", err);
      setError("Failed to load category");
      setLoading(false);
    }
  };

  const dedupeAndSortLatest = (items: LatestResult[]): LatestResult[] => {
    const seen = new Set<string>();
    const unique: LatestResult[] = [];
    for (const item of items) {
      const key = `${isVideoItem(item) ? "v" : "a"}-${item.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }
    unique.sort((a, b) => {
      const tA = new Date(a.date_time_post).getTime();
      const tB = new Date(b.date_time_post).getTime();
      return tB - tA;
    });
    return unique;
  };

  const fetchLatestResults = useCallback(
    async (
      targetPageArticles: number,
      targetPageVideos: number,
      append: boolean,
    ) => {
      try {
        if (append) setLatestLoadingMore(true);
        else setLoading(true);
        setError(null);

        const [articlesRes, videosRes] = await Promise.all([
          getArticles(undefined, {
            per_page: 25,
            page: targetPageArticles,
          }),
          getVideos(undefined, {
            per_page: 20,
            page: targetPageVideos,
          }),
        ]);

        setLatestPageArticles(articlesRes.meta.current_page);
        setLatestPageVideos(videosRes.meta.current_page);
        setLatestHasMoreArticles(
          articlesRes.meta.current_page < articlesRes.meta.last_page,
        );
        setLatestHasMoreVideos(
          videosRes.meta.current_page < videosRes.meta.last_page,
        );

        const batch: LatestResult[] = [
          ...(articlesRes.data as LatestResult[]),
          ...(videosRes.data as LatestResult[]),
        ];
        setLatestResults((prev) =>
          append
            ? dedupeAndSortLatest([...prev, ...batch])
            : dedupeAndSortLatest(batch),
        );
      } catch (err) {
        console.error("Error fetching latest results:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch latest articles and videos",
        );
      } finally {
        setLoading(false);
        setLatestLoadingMore(false);
      }
    },
    [],
  );

  // Infinite scroll for latest page (same as search)
  useEffect(() => {
    if (slug?.toLowerCase() !== "latest") return;
    if (!latestSentinelRef.current) return;
    if (!latestHasMoreArticles && !latestHasMoreVideos) return;

    const el = latestSentinelRef.current;
    if (latestObserverRef.current) {
      latestObserverRef.current.disconnect();
    }

    latestObserverRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first.isIntersecting &&
          !loading &&
          !latestLoadingMore &&
          (latestHasMoreArticles || latestHasMoreVideos)
        ) {
          const nextA = latestHasMoreArticles
            ? latestPageArticles + 1
            : latestPageArticles;
          const nextV = latestHasMoreVideos
            ? latestPageVideos + 1
            : latestPageVideos;
          fetchLatestResults(nextA, nextV, true);
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.1 },
    );

    latestObserverRef.current.observe(el);
    return () => {
      if (latestObserverRef.current) {
        latestObserverRef.current.disconnect();
      }
    };
  }, [
    slug,
    loading,
    latestLoadingMore,
    latestHasMoreArticles,
    latestHasMoreVideos,
    latestPageArticles,
    latestPageVideos,
    fetchLatestResults,
  ]);

  const fetchCategoryMergedResults = useCallback(
    async (
      categoryId: number,
      targetPageArticles: number,
      targetPageVideos: number,
      append: boolean,
    ) => {
      try {
        if (append) setCategoryLoadingMore(true);
        else setLoading(true);
        setError(null);

        const [articlesRes, videosRes] = await Promise.all([
          getArticles(categoryId, {
            per_page: 25,
            page: targetPageArticles,
          }),
          getVideos(categoryId, {
            per_page: 20,
            page: targetPageVideos,
          }),
        ]);

        setCategoryPageArticles(articlesRes.meta.current_page);
        setCategoryPageVideos(videosRes.meta.current_page);
        setCategoryHasMoreArticles(
          articlesRes.meta.current_page < articlesRes.meta.last_page,
        );
        setCategoryHasMoreVideos(
          videosRes.meta.current_page < videosRes.meta.last_page,
        );

        const batch: LatestResult[] = [
          ...(articlesRes.data as LatestResult[]),
          ...(videosRes.data as LatestResult[]),
        ];
        setCategoryResults((prev) =>
          append
            ? dedupeAndSortLatest([...prev, ...batch])
            : dedupeAndSortLatest(batch),
        );
      } catch (err) {
        console.error("Error fetching category results:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch category articles and videos",
        );
      } finally {
        setLoading(false);
        setCategoryLoadingMore(false);
      }
    },
    [],
  );

  // Infinite scroll for category pages (same as latest)
  useEffect(() => {
    const isCategoryPage = category && slug?.toLowerCase() !== "video";
    if (!isCategoryPage) return;
    if (!categorySentinelRef.current) return;
    if (!categoryHasMoreArticles && !categoryHasMoreVideos) return;

    const el = categorySentinelRef.current;
    if (categoryObserverRef.current) {
      categoryObserverRef.current.disconnect();
    }

    categoryObserverRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first.isIntersecting &&
          !loading &&
          !categoryLoadingMore &&
          (categoryHasMoreArticles || categoryHasMoreVideos)
        ) {
          categoryLoadMoreStartIndexRef.current = categoryResults.length;
          const nextA = categoryHasMoreArticles
            ? categoryPageArticles + 1
            : categoryPageArticles;
          const nextV = categoryHasMoreVideos
            ? categoryPageVideos + 1
            : categoryPageVideos;
          fetchCategoryMergedResults(category.id, nextA, nextV, true);
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.1 },
    );

    categoryObserverRef.current.observe(el);
    return () => {
      if (categoryObserverRef.current) {
        categoryObserverRef.current.disconnect();
      }
    };
  }, [
    slug,
    category,
    loading,
    categoryLoadingMore,
    categoryHasMoreArticles,
    categoryHasMoreVideos,
    categoryPageArticles,
    categoryPageVideos,
    categoryResults.length,
    fetchCategoryMergedResults,
  ]);

  // When category load more finishes: scroll first new item into view
  useEffect(() => {
    const isCategoryPage = category && slug?.toLowerCase() !== "video";
    if (!isCategoryPage) return;
    const wasLoading = prevCategoryLoadingMoreRef.current;
    prevCategoryLoadingMoreRef.current = categoryLoadingMore;
    if (
      wasLoading &&
      !categoryLoadingMore &&
      categoryResults.length > categoryLoadMoreStartIndexRef.current
    ) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (categoryFirstNewItemRef.current) {
            categoryFirstNewItemRef.current.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        });
      });
    }
  }, [slug, category, categoryLoadingMore, categoryResults.length]);

  const fetchVideoNews = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all news without category filter
      const response = await getNews();

      // Filter news with video URL (middle_video_url) not null
      const videosWithUrl = response.data.filter(
        (article) =>
          article.middle_video_url !== null &&
          article.middle_video_url !== undefined,
      );

      // Sort by date_time_post (newest first)
      const sortedNews = videosWithUrl.sort((a, b) => {
        const dateA = new Date(a.date_time_post).getTime();
        const dateB = new Date(b.date_time_post).getTime();
        return dateB - dateA; // Descending order (newest first)
      });

      setNews(sortedNews);
      setCategory(null); // No category for "video"
    } catch (err) {
      console.error("Error fetching video news:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch video news",
      );
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <>
        <SEO
          title="Loading - The Khmer Today"
          description="Loading news articles..."
          keywords="news, articles, The Khmer Today"
        />
        <BannerSponsor />
        <div className="w-full space-y-6 mt-4">
          {/* Header Skeleton */}
          <div className="border-b border-gray-200 pb-4">
            <div className="h-8 bg-gray-200 rounded-[10px] w-48 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded-[10px] w-32 animate-pulse"></div>
          </div>

          {/* Mobile: List View Skeleton */}
          <div className="space-y-4 md:hidden">
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className="flex flex-row gap-4 animate-pulse"
              >
                {/* Article Image Skeleton - Smaller on mobile (max-400px) */}
                <div className="relative max-[400px]:w-[150px] max-[400px]:h-[90px] w-[200px] h-[120px] shrink-0 rounded-[10px] bg-gray-200"></div>

                {/* Article Info Skeleton */}
                <div className="flex-1 flex flex-col justify-center space-y-2">
                  <div className="flex flex-row space-x-5">
                    <div className="h-3 bg-gray-200 rounded-[10px] w-20"></div>
                    <div className="h-3 bg-gray-200 rounded-[10px] w-24"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded-[10px] w-full"></div>
                  <div className="h-4 bg-gray-200 rounded-[10px] w-5/6"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Grid View Skeleton */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="flex flex-col space-y-3 animate-pulse">
                {/* Article Image Skeleton */}
                <div className="relative w-full h-[200px] rounded-[10px] bg-gray-200"></div>

                {/* Article Info Skeleton */}
                <div className="flex flex-col space-y-2">
                  <div className="h-4 bg-gray-200 rounded-[10px] w-20"></div>
                  <div className="h-4 bg-gray-200 rounded-[10px] w-24"></div>
                  <div className="h-5 bg-gray-200 rounded-[10px] w-full"></div>
                  <div className="h-5 bg-gray-200 rounded-[10px] w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded-[10px] w-full"></div>
                  <div className="h-4 bg-gray-200 rounded-[10px] w-5/6"></div>
                </div>
              </div>
            ))}
          </div>
      </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  // Generate SEO metadata based on page content
  const getSEOMetadata = () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const currentUrl = `${baseUrl}/${slug}`;

    if (category) {
      const count = categoryResults.length;
      return {
        title: `${category.name} - The Khmer Today`,
        description: `Browse ${category.name} news and articles on The Khmer Today. Stay updated with the latest ${category.name.toLowerCase()} stories, breaking news, and in-depth coverage.`,
        subtitle: `Find the latest ${category.name} news, articles, and videos. ${count} ${count === 1 ? "item" : "items"} available.`,
        keywords: `${category.name}, news, articles, The Khmer Today, Cambodia, Khmer news`,
        url: currentUrl,
      };
    } else if (slug?.toLowerCase() === "latest") {
      const count = latestResults.length;
      return {
        title: "Latest News - The Khmer Today",
        description:
          "Stay updated with the latest news and breaking stories from The Khmer Today. Get real-time updates on national, international, and local news.",
        subtitle: `Discover the most recent news articles and videos. ${count} ${count === 1 ? "item" : "items"} available.`,
        keywords:
          "latest news, breaking news, current events, The Khmer Today, Cambodia news, Khmer news",
        url: currentUrl,
      };
    } else if (slug?.toLowerCase() === "video") {
      return {
        title: "News Videos - The Khmer Today",
        description:
          "Watch the latest news videos and video reports from The Khmer Today. Stay informed with video coverage of breaking news and stories.",
        subtitle: `Watch the latest news videos and video reports. ${news.length} ${news.length === 1 ? "video" : "videos"} available.`,
        keywords:
          "news videos, video news, video reports, The Khmer Today, Cambodia videos, Khmer videos",
        url: currentUrl,
      };
    }

    return {
      title: "The Khmer Today",
      description:
        "The Khmer Today - Your trusted source for news, articles, and updates.",
      subtitle: "Stay informed with the latest news and stories.",
      keywords: "news, articles, The Khmer Today, Cambodia, Khmer",
      url: currentUrl,
    };
  };

  const seoData = getSEOMetadata();

  return (
    <>
      <SEO
        title={seoData.title}
        description={seoData.description}
        subtitle={seoData.subtitle}
        keywords={seoData.keywords}
        url={seoData.url}
        image={
          slug?.toLowerCase() === "latest"
            ? latestResults.length > 0 && latestResults[0].cover
              ? latestResults[0].cover
              : undefined
            : category && slug?.toLowerCase() !== "video"
              ? categoryResults.length > 0 && categoryResults[0].cover
                ? categoryResults[0].cover
                : undefined
              : news.length > 0 && news[0].cover
                ? news[0].cover
                : undefined
        }
      />
      <BannerSponsor />
      <div className="w-full space-y-6 mt-4">
        {/* Category Header, Latest Header, or Video Header */}
        {category ? (
          <div className="border-b border-gray-200 pb-4">
            <h1 
              className={`text-2xl font-bold text-[#1D2229] ${getFontClassName(category.name)}`}
              style={getFontStyle(category.name)}
            >
              {category.name}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {categoryResults.length}{" "}
              {categoryResults.length === 1 ? "item" : "items"} found
            </p>
          </div>
        ) : slug?.toLowerCase() === "latest" ? (
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-[#1D2229]">Latest News</h1>
            <p className="text-sm text-gray-600 mt-1">
              {latestResults.length}{" "}
              {latestResults.length === 1 ? "item" : "items"} found
            </p>
          </div>
        ) : slug?.toLowerCase() === "video" ? (
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-[#1D2229]">News Video</h1>
            <p className="text-sm text-gray-600 mt-1">
              {news.length} {news.length === 1 ? "video" : "videos"} found
            </p>
          </div>
        ) : null}

        {/* Latest: same as search — single grid, articles + videos, infinite scroll + RevealItem */}
        {slug?.toLowerCase() === "latest" ? (
          latestResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 text-lg font-medium mb-2">
                No articles or videos yet
              </p>
              <p className="text-gray-500 text-sm text-center max-w-md">
                We couldn&apos;t find any latest items at the moment. Please check back later.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {latestResults.map((item, index) => (
                  <RevealItem
                    key={`${isVideoItem(item) ? "v" : "a"}-${item.id}`}
                    delayMs={index * 5}
                  >
                    <Link
                      href={
                        isVideoItem(item)
                          ? `/news/v-${item.id}`
                          : `/news/${item.id}`
                      }
                      className="flex flex-col space-y-3 cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <div className="relative w-full h-[200px] rounded-lg overflow-hidden bg-gray-200 group">
                        {item.cover ? (
                          <img
                            src={item.cover}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : isVideoItem(item) ? (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                            <Play className="w-16 h-16 text-gray-500" />
                          </div>
                        ) : null}
                        {isVideoItem(item) && item.cover && (
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
                      <div className="flex flex-col space-y-2">
                        {item.category && (
                          <span
                            className={`text-sm font-semibold text-[#085C9C] ${getFontClassName(item.category.name)}`}
                            style={getFontStyle(item.category.name)}
                          >
                            {item.category.name}
                          </span>
                        )}
                        <p className="text-xs text-[#1D2229] font-medium">
                          {formatDate(item.date_time_post)}
                        </p>
                        <h2
                          className={`text-lg font-semibold text-gray-900 line-clamp-2 leading-tight ${getFontClassName(item.title)}`}
                          style={getFontStyle(item.title)}
                        >
                          {item.title}
                        </h2>
                        {item.subtitle && (
                          <p
                            className={`text-sm text-gray-600 line-clamp-2 ${getFontClassName(item.subtitle)}`}
                            style={getFontStyle(item.subtitle)}
                          >
                            {item.subtitle}
                          </p>
                        )}
                        {item.content_blocks &&
                          item.content_blocks.length > 0 && (
                            <p
                              className={`text-sm text-gray-700 line-clamp-3 ${getFontClassName(item.content_blocks[0].paragraph)}`}
                              style={getFontStyle(item.content_blocks[0].paragraph)}
                            >
                              {item.content_blocks[0].paragraph}
                            </p>
                          )}
                      </div>
                    </Link>
                  </RevealItem>
                ))}
              </div>
              <div ref={latestSentinelRef} className="h-1 w-full" />
              {latestLoadingMore && (
                <div className="flex items-center justify-center py-6">
                  <p className="text-sm text-gray-500">Loading more...</p>
                </div>
              )}
              {!latestHasMoreArticles &&
                !latestHasMoreVideos &&
                latestResults.length > 0 && (
                  <div className="flex items-center justify-center py-4">
                    <p className="text-xs text-gray-400">
                      You&apos;ve reached the end of the results.
                    </p>
                  </div>
                )}
            </>
          )
        ) : category && slug?.toLowerCase() !== "video" ? (
          categoryResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 text-lg font-medium mb-2">
                No articles or videos in this category
              </p>
              <p className="text-gray-500 text-sm text-center max-w-md">
                We couldn&apos;t find any items in {category.name} at the moment.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryResults.map((item, index) => {
                  const startIdx = categoryLoadMoreStartIndexRef.current;
                  const delayMs =
                    index < startIdx ? index * 5 : (index - startIdx) * 5;
                  const isFirstNewItem = index === startIdx;
                  const card = (
                    <RevealItem
                      key={`${isVideoItem(item) ? "v" : "a"}-${item.id}`}
                      delayMs={delayMs}
                    >
                      <Link
                        href={
                          isVideoItem(item)
                            ? `/news/v-${item.id}`
                            : `/news/${item.id}`
                        }
                        className="flex flex-col space-y-3 cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <div className="relative w-full h-[200px] rounded-lg overflow-hidden bg-gray-200 group">
                          {item.cover ? (
                            <img
                              src={item.cover}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : isVideoItem(item) ? (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                              <Play className="w-16 h-16 text-gray-500" />
                            </div>
                          ) : null}
                          {isVideoItem(item) && item.cover && (
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
                        <div className="flex flex-col space-y-2">
                          {item.category && (
                            <span
                              className={`text-sm font-semibold text-[#085C9C] ${getFontClassName(item.category.name)}`}
                              style={getFontStyle(item.category.name)}
                            >
                              {item.category.name}
                            </span>
                          )}
                          <p className="text-xs text-[#1D2229] font-medium">
                            {formatDate(item.date_time_post)}
                          </p>
                          <h2
                            className={`text-lg font-semibold text-gray-900 line-clamp-2 leading-tight ${getFontClassName(item.title)}`}
                            style={getFontStyle(item.title)}
                          >
                            {item.title}
                          </h2>
                          {item.subtitle && (
                            <p
                              className={`text-sm text-gray-600 line-clamp-2 ${getFontClassName(item.subtitle)}`}
                              style={getFontStyle(item.subtitle)}
                            >
                              {item.subtitle}
                            </p>
                          )}
                          {item.content_blocks &&
                            item.content_blocks.length > 0 && (
                              <p
                                className={`text-sm text-gray-700 line-clamp-3 ${getFontClassName(item.content_blocks[0].paragraph)}`}
                                style={getFontStyle(item.content_blocks[0].paragraph)}
                              >
                                {item.content_blocks[0].paragraph}
                              </p>
                            )}
                        </div>
                      </Link>
                    </RevealItem>
                  );
                  return isFirstNewItem ? (
                    <div
                      key={`anchor-${isVideoItem(item) ? "v" : "a"}-${item.id}`}
                      ref={categoryFirstNewItemRef}
                    >
                      {card}
                    </div>
                  ) : (
                    card
                  );
                })}
              </div>
              <div ref={categorySentinelRef} className="h-1 w-full" />
              {categoryLoadingMore && (
                <div className="flex items-center justify-center py-6">
                  <p className="text-sm text-gray-500">Loading more...</p>
                </div>
              )}
              {!categoryHasMoreArticles &&
                !categoryHasMoreVideos &&
                categoryResults.length > 0 && (
                  <div className="flex items-center justify-center py-4">
                    <p className="text-xs text-gray-400">
                      You&apos;ve reached the end of the results.
                    </p>
                  </div>
                )}
            </>
          )
        ) : news.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 text-lg font-medium mb-2">
              No news available
            </p>
            <p className="text-gray-500 text-sm text-center max-w-md">
              {category
                ? `We couldn't find any articles in the "${category.name}" category at the moment.`
                : "We couldn't find any articles at the moment. Please check back later."}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: List View (max-width: 767px) - Small cards */}
            <div className="space-y-4 md:hidden">
              {news.map((article) => (
                <Link
                  key={article.id}
                  href={`/news/${article.id}`}
                  className="flex flex-row gap-4 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  {/* Article Image - Smaller on mobile (max-400px) */}
                  <div className="relative max-[400px]:w-[150px] max-[400px]:h-[90px] w-[200px] h-[120px] shrink-0 rounded-lg overflow-hidden bg-gray-200 group">
                    {article.cover && (
                      <img
                        src={article.cover}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                  </div>

                  {/* Article Info - Mobile: simplified */}
                  <div className="flex-1 flex flex-col justify-center space-y-2">
                    <div className="flex flex-row space-x-5 max-[481px]:flex-col max-[481px]:space-x-0 max-[481px]:space-y-1">
                      {article.category && (
                        <span 
                          className={`text-xs max-[481px]:text-[10px] font-semibold text-[#1D2229] underline decoration-[#085C9C] decoration-2 underline-offset-5 uppercase ${getFontClassName(article.category.name)}`}
                          style={getFontStyle(article.category.name)}
                        >
                          {article.category.name}
                        </span>
                      )}
                      <p
                        className="text-xs max-[481px]:text-[10px] font-medium font-poppins"
                        style={{ color: "rgba(29, 34, 41, 0.6784)" }}
                      >
                        {formatDate(article.date_time_post)}
                      </p>
                    </div>
                    <h2 
                      className={`text-lg max-[481px]:text-sm font-semibold text-gray-900 line-clamp-2 leading-tight ${getFontClassName(article.title)}`}
                      style={getFontStyle(article.title)}
                    >
                      {article.title}
                    </h2>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop: Grid View (min-width: 768px) - Original larger cards */}
            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((article) => (
                <Link
                  key={article.id}
                  href={`/news/${article.id}`}
                  className="flex flex-col space-y-3 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  {/* Article Image */}
                  {article.cover && (
                    <div className="relative w-full h-[200px] rounded-lg overflow-hidden bg-gray-200 group">
                      <img
                        src={article.cover}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  {/* Article Info */}
                  <div className="flex flex-col space-y-2">
                    {article.category && (
                      <span 
                        className={`text-xs max-[481px]:text-[10px] font-semibold text-[#1D2229] underline decoration-[#085C9C] decoration-2 underline-offset-5 uppercase ${getFontClassName(article.category.name)}`}
                        style={getFontStyle(article.category.name)}
                      >
                        {article.category.name}
                      </span>
                    )}
                    <p className="text-xs text-[#1D2229] font-medium">
                      {formatDate(article.date_time_post)}
                    </p>
                    <h2 
                      className={`text-lg font-semibold text-gray-900 line-clamp-2 leading-tight ${getFontClassName(article.title)}`}
                      style={getFontStyle(article.title)}
                    >
                      {article.title}
                    </h2>
                    {article.subtitle && (
                      <p 
                        className={`text-sm text-gray-600 line-clamp-2 ${getFontClassName(article.subtitle)}`}
                        style={getFontStyle(article.subtitle)}
                      >
                        {article.subtitle}
                      </p>
                    )}
                    {article.content_blocks &&
                      article.content_blocks.length > 0 && (
                        <p 
                          className={`text-sm text-gray-700 line-clamp-3 ${getFontClassName(article.content_blocks[0].paragraph)}`}
                          style={getFontStyle(article.content_blocks[0].paragraph)}
                        >
                          {article.content_blocks[0].paragraph}
                        </p>
                      )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
