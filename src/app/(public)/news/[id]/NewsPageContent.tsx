"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getNews } from "@/services/news";
import { getArticleById } from "@/services/article";
import { getVideoById } from "@/services/video";
import { getCategories } from "@/services/category";
import { categoryNameToSlug } from "@/utils/slug";
import type { News } from "@/types/news";
import type { Category } from "@/types/category";
import { Play } from "lucide-react";
import SEO from "@/components/SEO";
import StructuredData from "@/components/StructuredData";
import BannerSponsor from "@/features/sponsor/bannerSponsor";
import { getFontStyle, getFontClassName } from "@/utils/font";
import { getFirstSentenceFromContent } from "@/utils/article";

export default function NewsPageContent() {
  const params = useParams();
  const idParam = params?.id as string;
  const [news, setNews] = useState<News[]>([]);
  const [singleNews, setSingleNews] = useState<News | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [isNewsDetail, setIsNewsDetail] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchedIdRef = useRef<string | null>(null);

  // Helper function to deduplicate news by ID
  const deduplicateNews = (newsArray: News[]): News[] => {
    const seen = new Set<number>();
    return newsArray.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    });
  };

  useEffect(() => {
    if (!idParam) {
      return;
    }

    // Skip if this is the same ID we just fetched (prevents duplicate calls in React Strict Mode)
    // But only skip if we're currently fetching or have already fetched this ID
    if (idParam === lastFetchedIdRef.current && isFetchingRef.current) {
      return;
    }

    // Cancel any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    // Track this ID to prevent duplicate fetches
    lastFetchedIdRef.current = idParam;
    
    // Reset state
    setNews([]);
    setSingleNews(null);
    setCategory(null);
    setCategoryId(null);
    setIsNewsDetail(false);
    setError(null);
    
    fetchCategoryData();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      isFetchingRef.current = false;
    };
  }, [idParam]);

  const fetchCategoryData = async () => {
    // Prevent multiple simultaneous fetches for the same ID
    if (isFetchingRef.current && lastFetchedIdRef.current === idParam) {
      return;
    }
    
    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      const idParamLower = idParam.toLowerCase().trim();

      // Check if it's the "latest" route (not a category)
      if (idParamLower === "latest") {
        // Fetch all latest news sorted by date
        await fetchLatestNews();
        return;
      }

      // Check if it's the "video" route (not a category)
      if (idParamLower === "video") {
        // Fetch all news with video URL
        await fetchVideoNews();
        return;
      }

      // Handle explicit video detail route: /news/v-123
      if (idParamLower.startsWith("v-")) {
        const numericId = parseInt(idParamLower.slice(2), 10);
        if (!isNaN(numericId)) {
          try {
            const videoResponse = await getVideoById(numericId);
            if (abortControllerRef.current?.signal.aborted) return;
            if (videoResponse.success && videoResponse.data) {
              setSingleNews(videoResponse.data as unknown as News);
              setIsNewsDetail(true);
              setCategory(null);
              setNews([]);
              setLoading(false);
              isFetchingRef.current = false;
              return;
            }
          } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
          }
        }
      }

      // Check if request was aborted before making API call
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Try to parse as number first (for /news/123 routes)
      const numericId = parseInt(idParam, 10);
      if (!isNaN(numericId)) {
        // Numeric IDs are treated as article detail routes
        try {
          const articleResponse = await getArticleById(numericId);
          if (abortControllerRef.current?.signal.aborted) return;
          if (articleResponse.success && articleResponse.data) {
            setSingleNews(articleResponse.data as unknown as News);
            setIsNewsDetail(true);
            setCategory(null);
            setNews([]);
            setLoading(false);
            isFetchingRef.current = false;
            return;
          }
        } catch {
          if (abortControllerRef.current?.signal.aborted) return;
        }
      }
      
      // Check if request was aborted before fetching categories
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const response = await getCategories();
      
      // Check if request was aborted after fetching categories
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      let foundCategory: Category | null = null;
      let foundCategoryId: number | null = null;

      if (!isNaN(numericId)) {
        // It's a numeric ID - check categories
        const found = response.categories.find((cat) => cat.id === numericId);
        if (found) {
          // Found main category
          foundCategory = found;
          foundCategoryId = found.id;
        } else {
          // Check subcategories
          for (const cat of response.categories) {
            const subcategory = cat.subcategories.find(
              (sub) => sub.id === numericId,
            );
            if (subcategory) {
              // Found subcategory
              foundCategory = {
                id: subcategory.id,
                name: subcategory.name,
                parent_id: subcategory.parent_id,
                subcategories: [], // Empty array indicates it's a subcategory
              };
              foundCategoryId = subcategory.id;
              break;
            }
          }
        }
      } else {
        // It's a slug (like "national"), find by name
        const slugLower = idParamLower;

        // Search through main categories first
        for (const cat of response.categories) {
          const catSlug = categoryNameToSlug(cat.name).toLowerCase();
          const catNameLower = cat.name.toLowerCase().trim();

          if (catSlug === slugLower || catNameLower === slugLower) {
            // Found main category - backend will include main + all subcategories
            foundCategory = cat;
            foundCategoryId = cat.id;
            break;
          }

          // Check subcategories
          for (const subcat of cat.subcategories) {
            const subcatSlug = categoryNameToSlug(subcat.name).toLowerCase();
            const subcatNameLower = subcat.name.toLowerCase().trim();

            if (subcatSlug === slugLower || subcatNameLower === slugLower) {
              // Found subcategory - backend will show only this subcategory
              foundCategory = {
                id: subcat.id,
                name: subcat.name,
                parent_id: subcat.parent_id,
                subcategories: [], // Empty array indicates it's a subcategory
              };
              foundCategoryId = subcat.id;
              break;
            }
          }
          if (foundCategory) break;
        }
      }

      // Check if request was aborted before processing category
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      if (foundCategory && foundCategoryId) {
        setCategory(foundCategory);
        setCategoryId(foundCategoryId);
        // Fetch news with the category ID
        // Backend will automatically:
        // - For main categories: include main + all subcategories
        // - For subcategories: include only that subcategory
        await fetchNews(foundCategoryId, foundCategory);
      } else {
        setError("Category not found");
        setLoading(false);
        isFetchingRef.current = false;
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      console.error("Error fetching category:", err);
      setError("Failed to load category");
      setLoading(false);
    } finally {
      isFetchingRef.current = false;
    }
  };

  const fetchLatestNews = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all news without category filter
      const response = await getNews();
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Sort by date_time_post (newest first)
      const sortedNews = response.data.sort((a, b) => {
        const dateA = new Date(a.date_time_post).getTime();
        const dateB = new Date(b.date_time_post).getTime();
        return dateB - dateA; // Descending order (newest first)
      });

      // Deduplicate news by ID before setting
      const uniqueNews = deduplicateNews(sortedNews);
      setNews(uniqueNews);
      setCategory(null); // No category for "latest"
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      console.error("Error fetching latest news:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch latest news",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoNews = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all news without category filter
      const response = await getNews();
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

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

      // Deduplicate news by ID before setting
      const uniqueNews = deduplicateNews(sortedNews);
      setNews(uniqueNews);
      setCategory(null); // No category for "video"
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      console.error("Error fetching video news:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch video news",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchNews = async (
    targetCategoryId: number,
    targetCategory: Category,
  ) => {
    if (!targetCategoryId || !targetCategory) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all news first (or use backend filtering if it works)
      const response = await getNews(targetCategoryId);
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Determine allowed category IDs for filtering
      let allowedCategoryIds: number[] = [];

      // Check if it's a main category (has subcategories)
      const isMainCategory =
        targetCategory.parent_id === null &&
        targetCategory.subcategories &&
        targetCategory.subcategories.length > 0;

      if (isMainCategory) {
        // Main category: Include main category ID + all subcategory IDs
        const subcategoryIds = targetCategory.subcategories.map(
          (sub) => sub.id,
        );
        allowedCategoryIds = [targetCategory.id, ...subcategoryIds];
      } else {
        // Subcategory or main category without subcategories: Only the exact category ID
        allowedCategoryIds = [targetCategoryId];
      }

      // Filter articles to only show those matching the allowed category IDs
      // Articles with video URLs are included if they match the category (no special filtering)
      const filteredNews = response.data.filter((article) => {
        // Exclude articles without category
        if (!article.category || !article.category.id) {
          return false;
        }

        // Check if article's category ID is in the allowed list
        // This includes both video and non-video articles
        return allowedCategoryIds.includes(article.category.id);
      });

      // Sort by date_time_post (newest first)
      const sortedNews = filteredNews.sort((a, b) => {
        const dateA = new Date(a.date_time_post).getTime();
        const dateB = new Date(b.date_time_post).getTime();
        return dateB - dateA; // Descending order (newest first)
      });

      // Deduplicate news by ID before setting
      const uniqueNews = deduplicateNews(sortedNews);
      setNews(uniqueNews);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      console.error("Error fetching news:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch news");
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

  const formatDateShort = (dateString: string) => {
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

  // Calculate relative time (e.g., "1 minute ago", "3 days ago")
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Just Now";
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks} ${diffInWeeks === 1 ? "week" : "weeks"} ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`;
  };

  // Convert YouTube URL to embed format
  const convertToYouTubeEmbed = (url: string | null): string | null => {
    if (!url) return null;

    try {
      const normalizedUrl = /^https?:\/\//i.test(url)
        ? url
        : `https://${url.replace(/^\/+/, "")}`;
      let videoId: string | null = null;

      // Handle youtu.be format
      const youtuBeMatch = normalizedUrl.match(/(?:youtu\.be\/)([^&\n?#]+)/);
      if (youtuBeMatch) {
        videoId = youtuBeMatch[1].split("&")[0].split("?")[0].trim();
      }

      // Handle youtube.com/watch?v= format
      const watchMatch = normalizedUrl.match(/(?:youtube\.com\/watch\?v=)([^&\n?#]+)/);
      if (watchMatch) {
        videoId = watchMatch[1].split("&")[0].split("?")[0].trim();
      }

      // Handle youtube.com/embed/ format (already embed)
      const embedMatch = normalizedUrl.match(/(?:youtube\.com\/embed\/)([^&\n?#]+)/);
      if (embedMatch) {
        return `https://www.youtube.com/embed/${embedMatch[1].split("&")[0].split("?")[0].trim()}`;
      }

      // Handle youtube.com/shorts/ format
      const shortsMatch = normalizedUrl.match(/(?:youtube\.com\/shorts\/)([^&\n?#]+)/);
      if (shortsMatch) {
        videoId = shortsMatch[1].split("&")[0].split("?")[0].trim();
      }

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }

      return normalizedUrl;
    } catch (error) {
      console.error("Error converting YouTube URL:", error);
      return /^https?:\/\//i.test(url)
        ? url
        : `https://${url.replace(/^\/+/, "")}`;
    }
  };

  const withYouTubeAutoplay = (embed: string): string => {
    // Start playing immediately after the first click.
    // playsinline helps mobile; rel/modestbranding reduce UI noise.
    const params = "autoplay=1&playsinline=1&rel=0&modestbranding=1";
    return embed.includes("?") ? `${embed}&${params}` : `${embed}?${params}`;
  };

  // Get YouTube thumbnail URL from video ID
  const getYouTubeThumbnail = (url: string | null): string | null => {
    if (!url) return null;

    let videoId: string | null = null;

    const youtuBeMatch = url.match(/(?:youtu\.be\/)([^&\n?#]+)/);
    if (youtuBeMatch) {
      videoId = youtuBeMatch[1].split("&")[0].split("?")[0].trim();
    }

    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=)([^&\n?#]+)/);
    if (watchMatch) {
      videoId = watchMatch[1].split("&")[0].split("?")[0].trim();
    }

    const embedMatch = url.match(/(?:youtube\.com\/embed\/)([^&\n?#]+)/);
    if (embedMatch) {
      videoId = embedMatch[1].split("&")[0].split("?")[0].trim();
    }

    const shortsMatch = url.match(/(?:youtube\.com\/shorts\/)([^&\n?#]+)/);
    if (shortsMatch) {
      videoId = shortsMatch[1].split("&")[0].split("?")[0].trim();
    }

    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }

    return null;
  };

  // Check if URL is a YouTube URL
  const isYouTubeUrl = (url: string | null): boolean => {
    if (!url) return false;
    return /youtube\.com|youtu\.be/.test(url);
  };

  // Get video thumbnail (YouTube or direct video)
  const getVideoThumbnail = (url: string | null): string | null => {
    if (!url) return null;

    if (isYouTubeUrl(url)) {
      return getYouTubeThumbnail(url);
    }

    // For direct video URLs, return null (we'll use video poster or default)
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Loading news...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  // Use production site URL for canonical/OG so staging doesn't override (NEXT_PUBLIC_SITE_URL must be set in all envs)
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL || "https://www.thekhmertoday.news";

  // Generate SEO metadata based on page content
  const getSEOMetadata = () => {
    const currentUrl = `${siteBase}/news/${idParam}`;

    if (isNewsDetail && singleNews) {
      // When no subtitle, use first sentence of body so meta description isn't just the title
      const descriptionFallback = getFirstSentenceFromContent(singleNews.content_blocks) || singleNews.title;
      const desc = singleNews.subtitle || descriptionFallback;
      const keywords = [singleNews.title, desc, singleNews.category?.name, "news", "articles", "The Khmer Today"]
        .filter(Boolean)
        .join(", ");
      const imageAbsolute = singleNews.cover
        ? singleNews.cover.startsWith("http")
          ? singleNews.cover
          : `${siteBase}${singleNews.cover.startsWith("/") ? "" : "/"}${singleNews.cover}`
        : undefined;
      return {
        title: `${singleNews.title} - The Khmer Today`,
        description: desc,
        subtitle:
          singleNews.subtitle || `Read the full article: ${singleNews.title}`,
        keywords,
        url: currentUrl,
        image: imageAbsolute,
        type: "article",
        datePublished: singleNews.date_time_post || singleNews.created_at,
        dateModified: singleNews.updated_at || singleNews.date_time_post || singleNews.created_at,
        author: singleNews.author,
      };
    } else if (category) {
      return {
        title: `${category.name} - The Khmer Today`,
        description: `Browse ${category.name} news and articles on The Khmer Today. Stay updated with the latest ${category.name.toLowerCase()} stories, breaking news, and in-depth coverage.`,
        subtitle: `Find the latest ${category.name} news, articles, and updates. ${news.length} ${news.length === 1 ? "article" : "articles"} available.`,
        keywords: `${category.name}, news, articles, The Khmer Today, Cambodia, Khmer news`,
        url: currentUrl,
      };
    } else if (idParam?.toLowerCase() === "latest") {
      return {
        title: "Latest News - The Khmer Today",
        description:
          "Stay updated with the latest news and breaking stories from The Khmer Today. Get real-time updates on national, international, and local news.",
        subtitle: `Discover the most recent news articles and stories. ${news.length} ${news.length === 1 ? "article" : "articles"} available.`,
        keywords:
          "latest news, breaking news, current events, The Khmer Today, Cambodia news, Khmer news",
        url: currentUrl,
      };
    } else if (idParam?.toLowerCase() === "video") {
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
      type: "website",
    };
  };

  const seoData = getSEOMetadata();

  // If it's a news detail page, show the news detail view
  if (isNewsDetail && singleNews) {
    // JSON-LD (NewsArticle, BreadcrumbList, VideoObject) is rendered server-side in page.tsx (ArticleJsonLd) so crawlers see it in initial HTML
    return (
      <>
        <SEO
          title={seoData.title}
          description={seoData.description}
          subtitle={seoData.subtitle}
          keywords={seoData.keywords}
          url={seoData.url}
          image={seoData.image}
          type={seoData.type}
          {...(seoData.datePublished && { datePublished: seoData.datePublished })}
          {...(seoData.dateModified && { dateModified: seoData.dateModified })}
          {...(seoData.author && { author: seoData.author })}
        />
        <BannerSponsor />
        <div className="w-full max-w-4xl mx-auto space-y-6 mt-6">
          {/* Metadata Header with Red Bar */}
          <div className="flex items-stretch gap-3 mb-4">
            <div className="w-1 min-h-12 rounded-[10px] bg-[#085c9c] self-stretch shrink-0"></div>
            <div className="flex flex-col gap-0.5 md:gap-1">
              {singleNews.category && (
                <span
                  className={`text-base font-bold text-[#1D2229] ${getFontClassName(singleNews.category.name)}`}
                  style={getFontStyle(singleNews.category.name)}
                >
                  {singleNews.category.name}
                </span>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">
                  {formatDateShort(singleNews.date_time_post)}
                </span>
                <span className="text-xs text-gray-500">
                  • {getRelativeTime(singleNews.date_time_post)}
                </span>
                {(singleNews.user?.username || singleNews.author || "The Khmer Today") && (
                  <span className="hidden md:inline text-sm text-gray-600">
                    • {(singleNews.user?.username || singleNews.author || "The Khmer Today")}
                  </span>
                )}
              </div>
              {(singleNews.user?.username || singleNews.author || "The Khmer Today") && (
                <span className="text-sm text-gray-600 md:hidden">
                  {singleNews.user?.username || singleNews.author || "The Khmer Today"}
                </span>
              )}
            </div>
          </div>

          {/* Main Title */}
          <h1
            className={`text-xl md:text-2xl lg:text-3xl font-bold text-[#1D2229] leading-relaxed ${getFontClassName(singleNews.title)}`}
            style={getFontStyle(singleNews.title)}
          >
            {singleNews.title}
          </h1>

          {/* Subtitle */}
          {singleNews.subtitle && (
            <p
              className={`text-xl text-gray-700 mt-4 ${getFontClassName(singleNews.subtitle)}`}
              style={getFontStyle(singleNews.subtitle)}
            >
              {singleNews.subtitle}
            </p>
          )}

          {/* {singleNews.author && (
            <p className="text-sm text-gray-600 mt-2">
              By {singleNews.author}
            </p>
          )} */}

          {/* Cover Image */}
          {singleNews.cover && (
            <div className="w-full mt-6">
              <img
                src={singleNews.cover}
                alt={singleNews.title}
                className="w-full h-auto object-cover rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {/* Cover Image Caption */}
              {singleNews.cover_name && (
                <p className="text-sm text-gray-600 mt-2 italic">
                  {singleNews.cover_name}
                </p>
              )}
            </div>
          )}

          {/* Content Blocks with Middle Media */}
          {singleNews.content_blocks &&
            singleNews.content_blocks.length > 0 && (
              <div className="prose prose-lg max-w-none mt-6 space-y-6 wrap-anywhere [&_a]:wrap-anywhere">
                {singleNews.content_blocks.map((block, index) => {
                  // Split paragraph by single line breaks (\n) to create separate paragraphs with spacing
                  // This treats each line break as a paragraph break
                  const paragraphs = block.paragraph
                    .split(/\n/)
                    .filter((p) => p.trim());

                  return (
                    <div key={index} className="space-y-6">
                      {/* Block Subtitle (if exists) */}
                      {block.subtitle && (
                        <h2
                          className={`text-2xl font-bold text-[#1D2229] mt-8 mb-6 ${getFontClassName(block.subtitle)}`}
                          style={getFontStyle(block.subtitle)}
                        >
                          {block.subtitle}
                        </h2>
                      )}

                      {/* Block Paragraphs - Split by line breaks, each creates a new paragraph with spacing */}
                      <div className="space-y-4">
                        {paragraphs.map((paragraph, paraIndex) => (
                          <p
                            key={paraIndex}
                            className={`text-base text-gray-800 leading-relaxed wrap-anywhere ${getFontClassName(paragraph.trim())}`}
                            style={getFontStyle(paragraph.trim())}
                          >
                            {paragraph.trim()}
                          </p>
                        ))}
                      </div>

                      {/* Insert Middle Media after first paragraph */}
                      {index === 0 && (
                        <>
                          {/* Middle Video */}
                          {singleNews.middle_video_url &&
                            (() => {
                              const videoUrl = singleNews.middle_video_url;
                              const isYouTube = isYouTubeUrl(videoUrl);
                              const embedUrl = isYouTube
                                ? convertToYouTubeEmbed(videoUrl)
                                : null;
                              const thumbnailUrl = getVideoThumbnail(videoUrl);

                              return (
                                <div className="w-full my-8">
                                  {isVideoPlaying ? (
                                    <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden">
                                      {isYouTube ? (
                                        <iframe
                                          src={withYouTubeAutoplay(embedUrl || videoUrl)}
                                          title={singleNews.title}
                                          className="absolute inset-0 w-full h-full"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                          allowFullScreen
                                        />
                                      ) : (
                                        /* Direct Video from Storage - Use HTML5 video element */
                                        <video
                                          src={videoUrl}
                                          controls
                                          autoPlay
                                          className="w-full h-full object-contain"
                                          style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            width: "100%",
                                            height: "100%",
                                          }}
                                          onError={(e) => {
                                            console.error(
                                              "Video failed to load:",
                                              videoUrl,
                                            );
                                            const video =
                                              e.target as HTMLVideoElement;
                                            video.style.display = "none";
                                          }}
                                        >
                                          Your browser does not support the
                                          video tag.
                                        </video>
                                      )}

                                      {/* Close/Back button to return to thumbnail */}
                                      <button
                                        onClick={() => setIsVideoPlaying(false)}
                                        className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-3 py-1 rounded hover:bg-opacity-70 transition-all z-30"
                                      >
                                        × Close
                                      </button>
                                    </div>
                                  ) : (
                                    /* Thumbnail with Play Button - Show before click */
                                    <div
                                      onClick={() => {
                                        setIsVideoPlaying(true);
                                      }}
                                      className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden cursor-pointer group"
                                    >
                                      {/* Thumbnail Image */}
                                      {thumbnailUrl ? (
                                        <img
                                          src={thumbnailUrl}
                                          alt={singleNews.title}
                                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                          style={{ zIndex: 0 }}
                                          onError={(e) => {
                                            const img =
                                              e.target as HTMLImageElement;
                                            const currentSrc = img.src;
                                            if (
                                              currentSrc.includes(
                                                "maxresdefault",
                                              )
                                            ) {
                                              const videoId =
                                                currentSrc.match(
                                                  /vi\/([^\/]+)\//,
                                                )?.[1];
                                              if (videoId) {
                                                img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                              } else {
                                                img.style.display = "none";
                                              }
                                            } else if (
                                              currentSrc.includes("hqdefault")
                                            ) {
                                              img.style.display = "none";
                                            }
                                          }}
                                        />
                                      ) : (
                                        /* For direct video URLs, show default placeholder or use cover image if available */
                                        <>
                                          {singleNews.cover && !isYouTube ? (
                                            <img
                                              src={singleNews.cover}
                                              alt={singleNews.title}
                                              className="absolute inset-0 w-full h-full object-cover"
                                              style={{ zIndex: 0 }}
                                            />
                                          ) : (
                                            <div
                                              className="absolute inset-0 w-full h-full bg-linear-to-br from-gray-300 to-gray-400 flex items-center justify-center"
                                              style={{ zIndex: 0 }}
                                            >
                                              <Play className="w-16 h-16 text-gray-500" />
                                            </div>
                                          )}
                                        </>
                                      )}

                                      {/* Play Button Overlay */}
                                      <div className="absolute inset-0 flex items-center justify-center bg-opacity-30 group-hover:bg-opacity-40 transition-all z-10">
                                        <div className="w-20 h-20 rounded-full bg-[#ffffff]/50 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                          <Play
                                            className="w-10 h-10 text-white ml-1"
                                            fill="currentColor"
                                          />
                                        </div>
                                      </div>

                                      {/* Hover text */}
                                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <span className="text-white font-medium text-sm bg-black bg-opacity-50 px-4 py-2 rounded-lg">
                                          {isYouTube
                                            ? "Click to watch on YouTube"
                                            : "Click to play video"}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Video Caption */}
                                  {singleNews.middle_video_name && (
                                    <p className="text-sm text-gray-600 mt-2 italic">
                                      {singleNews.middle_video_name}
                                    </p>
                                  )}
                                </div>
                              );
                            })()}

                          {/* Middle Image (if no video) */}
                          {!singleNews.middle_video_url &&
                            singleNews.middle_image_url && (
                              <div className="w-full my-8">
                                <img
                                  src={singleNews.middle_image_url}
                                  alt={
                                    singleNews.middle_image_name ||
                                    singleNews.title
                                  }
                                  className="w-full h-auto object-cover rounded-lg"
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                                {/* Image Caption */}
                                {singleNews.middle_image_name && (
                                  <p className="text-sm text-gray-600 mt-2 italic">
                                    {singleNews.middle_image_name}
                                  </p>
                                )}
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          {/* End Images */}
          {singleNews.end_images && singleNews.end_images.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {singleNews.end_images.map((endImage, index) => (
                <div key={index} className="w-full">
                  <img
                    src={endImage.url}
                    alt={endImage.name || `End image ${index + 1}`}
                    className="w-full h-auto object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  {/* End Image Caption */}
                  {endImage.name && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      {endImage.name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title={seoData.title}
        description={seoData.description}
        subtitle={seoData.subtitle}
        keywords={seoData.keywords}
        url={seoData.url}
        image={news.length > 0 && news[0].cover ? news[0].cover : undefined}
      />
      <div className="w-full space-y-6">
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
              {news.length} {news.length === 1 ? "article" : "articles"} found
            </p>
          </div>
        ) : idParam?.toLowerCase() === "latest" ? (
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-[#1D2229]">Latest News</h1>
            <p className="text-sm text-gray-600 mt-1">
              {news.length} {news.length === 1 ? "article" : "articles"} found
            </p>
          </div>
        ) : idParam?.toLowerCase() === "video" ? (
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-[#1D2229]">News Video</h1>
            <p className="text-sm text-gray-600 mt-1">
              {news.length} {news.length === 1 ? "video" : "videos"} found
            </p>
          </div>
        ) : null}

        {/* News List/Grid */}
        {news.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-600">No news available for this category</p>
          </div>
        ) : (
          <>
            {/* Mobile: List View (max-width: 767px) */}
            <div className="space-y-4 md:hidden">
              {news.map((article) => (
                <Link
                  key={article.id}
                  href={`/news/${article.id}`}
                  className="flex flex-row gap-4 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  {/* Article Image */}
                  <div className="relative w-[250px] h-[160px] shrink-0 rounded-lg overflow-hidden bg-gray-200 group">
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
                    {/* Play Button Overlay for Videos */}
                    {article.middle_video_url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-opacity-30 group-hover:bg-opacity-40 transition-all">
                        <div className="w-16 h-16 rounded-full bg-[#ffffff]/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play
                            className="w-8 h-8 text-[#ffffff] ml-1"
                            fill="currentColor"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Article Info */}
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
                    {article.subtitle && (
                      <p
                        className={`text-sm max-[481px]:text-xs text-gray-600 line-clamp-2 mt-1 ${getFontClassName(article.subtitle)}`}
                        style={getFontStyle(article.subtitle)}
                      >
                        {article.subtitle}
                      </p>
                    )}
                    {article.content_blocks &&
                      article.content_blocks.length > 0 && (
                        <p
                          className={`text-sm max-[481px]:text-xs text-gray-600 line-clamp-2 mt-1 ${getFontClassName(article.content_blocks[0].paragraph)}`}
                          style={getFontStyle(article.content_blocks[0].paragraph)}
                        >
                          {article.content_blocks[0].paragraph}
                        </p>
                      )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop: Grid View (min-width: 768px) */}
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
                      {/* Play Button Overlay for Videos */}
                      {article.middle_video_url && (
                        <div className="absolute inset-0 flex items-center justify-center bg-opacity-30 group-hover:bg-opacity-40 transition-all">
                          <div className="w-16 h-16 rounded-full bg-[#ffffff]/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play
                              className="w-8 h-8 text-[#ffffff] ml-1"
                              fill="currentColor"
                            />
                          </div>
                        </div>
                      )}
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
