"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { getVideos } from "@/services/video";
import type { Video } from "@/types/video";
import { Play } from "lucide-react";
import { getFontStyle, getFontClassName } from "@/utils/font";
import RevealItem from "@/components/RevealItem";

export default function VideoDashboard() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const isFetchingRef = useRef(false);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    const dedupeAndSort = (items: Video[]): Video[] => {
        const seen = new Set<number>();
        const unique: Video[] = [];
        for (const v of items) {
            if (!seen.has(v.id)) {
                seen.add(v.id);
                unique.push(v);
            }
        }
        unique.sort(
            (a, b) =>
                new Date(b.date_time_post).getTime() -
                new Date(a.date_time_post).getTime(),
        );
        return unique;
    };

    const fetchVideos = useCallback(
        async (targetPage: number, append: boolean) => {
            if (isFetchingRef.current) return;
            try {
                isFetchingRef.current = true;
                if (append) {
                    setIsLoadingMore(true);
                    setInitialLoading(false);
                } else {
                    setInitialLoading(true);
                    setIsLoadingMore(false);
                    setHasMore(true);
                    setPage(1);
                    setVideos([]);
                }

                const response = await getVideos(undefined, {
                    page: targetPage,
                    per_page: 30,
                });

                setPage(response.meta.current_page);
                setHasMore(response.meta.current_page < response.meta.last_page);

                const batch = response.data;
                setVideos((prev) =>
                    append ? dedupeAndSort([...prev, ...batch]) : dedupeAndSort(batch),
                );
            } catch (error) {
                console.error("Error fetching videos:", error);
            } finally {
                setInitialLoading(false);
                setIsLoadingMore(false);
                isFetchingRef.current = false;
            }
        },
        [],
    );

    useEffect(() => {
        fetchVideos(1, false);
        // Cleanup
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
            isFetchingRef.current = false;
        };
    }, [fetchVideos]);

    useEffect(() => {
        if (!hasMore) return;
        if (!sentinelRef.current) return;

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
                    hasMore
                ) {
                    fetchVideos(page + 1, true);
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
    }, [hasMore, initialLoading, isLoadingMore, page, fetchVideos]);

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

    // Get video thumbnail (cover image or YouTube thumbnail)
    const getVideoThumbnail = (video: Video): string | null => {
        // First, try to use cover image
        if (video.cover) {
            return video.cover;
        }

        // If no cover, try to get YouTube thumbnail from video URL
        if (video.middle_video_url && isYouTubeUrl(video.middle_video_url)) {
            return getYouTubeThumbnail(video.middle_video_url);
        }

        return null;
    };

    if (initialLoading) {
        return (
            <div className="w-full space-y-8">
                {/* Main Featured Section Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Large Video Card Skeleton */}
                    <div className="lg:col-span-2 animate-pulse">
                        <div className="w-full space-y-4">
                            {/* Video Thumbnail Skeleton */}
                            <div className="relative w-full aspect-video rounded-[20px] bg-gray-200"></div>

                            {/* Video Info Skeleton */}
                            <div className="space-y-3">
                                <div className="flex gap-6 items-center">
                                    <div className="h-5 bg-gray-200 rounded-[10px] w-24"></div>
                                    <div className="h-4 bg-gray-200 rounded-[10px] w-32"></div>
                                </div>
                                <div className="h-8 bg-gray-200 rounded-[10px] w-full"></div>
                                <div className="h-8 bg-gray-200 rounded-[10px] w-5/6"></div>
                                <div className="h-5 bg-gray-200 rounded-[10px] w-full"></div>
                                <div className="h-5 bg-gray-200 rounded-[10px] w-4/5"></div>
                                <div className="h-4 bg-gray-200 rounded-[10px] w-full"></div>
                                <div className="h-4 bg-gray-200 rounded-[10px] w-5/6"></div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Small Video Cards Grid Skeleton */}
                    <div className="lg:col-span-1">
                        <div className="grid grid-cols-2 gap-4">
                            {[...Array(6)].map((_, index) => (
                                <div key={index} className="space-y-2 animate-pulse">
                                    {/* Video Thumbnail Skeleton */}
                                    <div className="relative w-full aspect-video rounded-[20px] bg-gray-200"></div>

                                    {/* Video Info Skeleton */}
                                    <div className="space-y-1">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="h-3 bg-gray-200 rounded-[10px] w-16"></div>
                                            <div className="h-3 bg-gray-200 rounded-[10px] w-20"></div>
                                        </div>
                                        <div className="h-4 bg-gray-200 rounded-[10px] w-full"></div>
                                        <div className="h-4 bg-gray-200 rounded-[10px] w-3/4"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Remaining Videos Grid Skeleton */}
                <div className="space-y-6">
                    {/* "More Videos" Title Skeleton */}
                    <div className="h-7 bg-gray-200 rounded-[10px] w-40 animate-pulse"></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, index) => (
                            <div key={index} className="space-y-3 animate-pulse">
                                {/* Video Thumbnail Skeleton */}
                                <div className="relative w-full aspect-video rounded-[20px] bg-gray-200"></div>

                                {/* Video Info Skeleton */}
                                <div className="space-y-2">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="h-3 bg-gray-200 rounded-[10px] w-20"></div>
                                        <div className="h-3 bg-gray-200 rounded-[10px] w-24"></div>
                                    </div>
                                    <div className="h-5 bg-gray-200 rounded-[10px] w-full"></div>
                                    <div className="h-5 bg-gray-200 rounded-[10px] w-3/4"></div>
                                    <div className="h-4 bg-gray-200 rounded-[10px] w-full"></div>
                                    <div className="h-4 bg-gray-200 rounded-[10px] w-5/6"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!initialLoading && videos.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <p className="text-gray-600">No videos available</p>
            </div>
        );
    }

    const mainVideo = videos[0];
    const featuredVideos = videos.slice(1, 7); // Next 6 videos for right side (3 rows x 2 columns)
    const remainingVideos = videos.slice(7); // Remaining videos for grid below

    return (
        <div className="w-full space-y-8">
            {/* Header */}
            {/* <div className="border-b border-gray-200 pb-4">
                <h1 className="text-2xl font-bold text-[#1D2229]">News Videos</h1>
                <p className="text-sm text-gray-600 mt-1">
                    {videos.length} {videos.length === 1 ? "video" : "videos"} available
                </p>
            </div> */}

            {/* Main Featured Section: Large video on left, 4 small videos on right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Large Video Card */}
                <div className="lg:col-span-2">
                    {mainVideo && (
                        <RevealItem delayMs={0}>
                            <Link
                                href={`/news/v-${mainVideo.id}`}
                                className="block cursor-pointer hover:opacity-90 transition-opacity"
                            >
                                <div className="w-full space-y-4">
                                    {/* Video Thumbnail */}
                                    <div className="relative w-full aspect-video rounded-[20px] overflow-hidden bg-gray-200 group">
                                        {getVideoThumbnail(mainVideo) ? (
                                            <img
                                                src={getVideoThumbnail(mainVideo)!}
                                                alt={mainVideo.title}
                                                className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                                                onError={(e) => {
                                                    const img = e.target as HTMLImageElement;
                                                    const currentSrc = img.src;
                                                    // If YouTube thumbnail fails, try hqdefault
                                                    if (currentSrc.includes("maxresdefault")) {
                                                        const videoId = currentSrc.match(/vi\/([^\/]+)\//)?.[1];
                                                        if (videoId) {
                                                            img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                                        } else {
                                                            img.style.display = "none";
                                                        }
                                                    } else {
                                                        img.style.display = "none";
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                                                <Play className="w-16 h-16 text-gray-500" />
                                            </div>
                                        )}
                                        {/* Play Button Overlay */}
                                        <div className="absolute inset-0 flex items-center justify-center bg-opacity-30 group-hover:bg-opacity-40 transition-all">
                                            <div className="w-20 h-20 rounded-full bg-[#ffffff]/50 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                                <Play
                                                    className="w-10 h-10 text-white ml-1"
                                                    fill="currentColor"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Video Info */}
                                    <div className="space-y-3">
                                        <div className="flex gap-6 items-center">
                                            {mainVideo.category && (
                                                <span 
                                                    className={`inline-block text-sm font-semibold text-[#1D2229] underline decoration-[#085C9C] decoration-2 underline-offset-5 uppercase ${getFontClassName(mainVideo.category.name)}`}
                                                    style={getFontStyle(mainVideo.category.name)}
                                                >
                                                    {mainVideo.category.name}
                                                </span>
                                            )}
                                            <p className="text-xs text-gray-500 font-medium">
                                                {formatDate(mainVideo.date_time_post)}
                                            </p>
                                        </div>
                                        <h2 
                                            className={`text-2xl lg:text-3xl font-bold text-[#1D2229] leading-tight ${getFontClassName(mainVideo.title)}`}
                                            style={getFontStyle(mainVideo.title)}
                                        >
                                            {mainVideo.title}
                                        </h2>
                                        {mainVideo.subtitle && (
                                            <p 
                                                className={`text-base text-gray-700 line-clamp-3 ${getFontClassName(mainVideo.subtitle)}`}
                                                style={getFontStyle(mainVideo.subtitle)}
                                            >
                                                {mainVideo.subtitle}
                                            </p>
                                        )}
                                        {mainVideo.content_blocks &&
                                            mainVideo.content_blocks.length > 0 && (
                                                <p 
                                                    className={`text-sm text-gray-600 line-clamp-2 ${getFontClassName(mainVideo.content_blocks[0].paragraph)}`}
                                                    style={getFontStyle(mainVideo.content_blocks[0].paragraph)}
                                                >
                                                    {mainVideo.content_blocks[0].paragraph}
                                                </p>
                                            )}
                                    </div>
                                </div>
                            </Link>
                        </RevealItem>
                    )}
                </div>

                {/* Right: 4 Small Video Cards Grid */}
                <div className="lg:col-span-1">
                    <div className="grid grid-cols-2 gap-4">
                        {featuredVideos.map((video, index) => (
                            <RevealItem key={video.id} delayMs={index * 30}>
                                <Link
                                    href={`/news/v-${video.id}`}
                                    className="block cursor-pointer hover:opacity-90 transition-opacity"
                                >
                                    <div className="space-y-2">
                                        {/* Video Thumbnail */}
                                        <div className="relative w-full aspect-video rounded-[20px] overflow-hidden bg-gray-200 group">
                                            {getVideoThumbnail(video) ? (
                                                <img
                                                    src={getVideoThumbnail(video)!}
                                                    alt={video.title}
                                                    className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                                                    onError={(e) => {
                                                        const img = e.target as HTMLImageElement;
                                                        const currentSrc = img.src;
                                                        // If YouTube thumbnail fails, try hqdefault
                                                        if (currentSrc.includes("maxresdefault")) {
                                                            const videoId = currentSrc.match(/vi\/([^\/]+)\//)?.[1];
                                                            if (videoId) {
                                                                img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                                            } else {
                                                                img.style.display = "none";
                                                            }
                                                        } else {
                                                            img.style.display = "none";
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                                                    <Play className="w-8 h-8 text-gray-500" />
                                                </div>
                                            )}
                                            {/* Play Button Overlay */}
                                            <div className="absolute inset-0 flex items-center justify-center bg-opacity-30 group-hover:bg-opacity-40 transition-all">
                                                <div className="w-12 h-12 rounded-full bg-[#ffffff]/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Play
                                                        className="w-6 h-6 text-white ml-0.5"
                                                        fill="currentColor"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Video Info */}
                                        <div className="space-y-1">
                                            <div className="flex flex-col gap-1.5">
                                                {video.category && (
                                                    <span 
                                                        className={`text-xs font-semibold text-[#1D2229] underline decoration-[#085C9C] decoration-2 underline-offset-5 uppercase ${getFontClassName(video.category.name)}`}
                                                        style={getFontStyle(video.category.name)}
                                                    >
                                                        {video.category.name}
                                                    </span>
                                                )}
                                                <p className="text-xs text-gray-500">
                                                    {formatDate(video.date_time_post)}
                                                </p>
                                            </div>
                                            <h3 
                                                className={`text-sm font-semibold text-gray-900 line-clamp-2 leading-tight ${getFontClassName(video.title)}`}
                                                style={getFontStyle(video.title)}
                                            >
                                                {video.title}
                                            </h3>
                                        </div>
                                    </div>
                                </Link>
                            </RevealItem>
                        ))}
                    </div>
                </div>
            </div>

            {/* Remaining Videos Grid */}
            {remainingVideos.length > 0 && (
                <div className="space-y-6">
                    <h2 
                        className={`text-xl font-bold text-[#1D2229] ${getFontClassName("More Videos")}`}
                        style={getFontStyle("More Videos")}
                    >
                        More News Videos
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {remainingVideos.map((video, index) => (
                            <RevealItem key={video.id} delayMs={index * 25}>
                                <Link
                                    href={`/news/v-${video.id}`}
                                    className="block cursor-pointer hover:opacity-90 transition-opacity"
                                >
                                    <div className="space-y-3">
                                        {/* Video Thumbnail */}
                                        <div className="relative w-full aspect-video rounded-[20px] overflow-hidden bg-gray-200 group">
                                            {getVideoThumbnail(video) ? (
                                                <img
                                                    src={getVideoThumbnail(video)!}
                                                    alt={video.title}
                                                    className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                                                    onError={(e) => {
                                                        const img = e.target as HTMLImageElement;
                                                        const currentSrc = img.src;
                                                        // If YouTube thumbnail fails, try hqdefault
                                                        if (currentSrc.includes("maxresdefault")) {
                                                            const videoId = currentSrc.match(/vi\/([^\/]+)\//)?.[1];
                                                            if (videoId) {
                                                                img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                                            } else {
                                                                img.style.display = "none";
                                                            }
                                                        } else {
                                                            img.style.display = "none";
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                                                    <Play className="w-8 h-8 text-gray-500" />
                                                </div>
                                            )}
                                            {/* Play Button Overlay */}
                                            <div className="absolute inset-0 flex items-center justify-center bg-opacity-30 group-hover:bg-opacity-40 transition-all">
                                                <div className="w-16 h-16 rounded-full bg-[#ffffff]/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Play
                                                        className="w-8 h-8 text-white ml-1"
                                                        fill="currentColor"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Video Info */}
                                        <div className="space-y-2">
                                            <div className="flex flex-col gap-1.5">
                                                {video.category && (
                                                    <span 
                                                        className={`text-xs font-semibold text-[#1D2229] underline decoration-[#085C9C] decoration-2 underline-offset-5 uppercase ${getFontClassName(video.category.name)}`}
                                                        style={getFontStyle(video.category.name)}
                                                    >
                                                        {video.category.name}
                                                    </span>
                                                )}
                                                <p className="text-xs text-gray-500 font-medium">
                                                    {formatDate(video.date_time_post)}
                                                </p>
                                            </div>
                                            <h3 
                                                className={`text-base font-semibold text-gray-900 line-clamp-2 leading-tight ${getFontClassName(video.title)}`}
                                                style={getFontStyle(video.title)}
                                            >
                                                {video.title}
                                            </h3>
                                            {video.subtitle && (
                                                <p 
                                                    className={`text-sm text-gray-600 line-clamp-2 ${getFontClassName(video.subtitle)}`}
                                                    style={getFontStyle(video.subtitle)}
                                                >
                                                    {video.subtitle}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            </RevealItem>
                        ))}
                    </div>
                    {/* Infinite scroll sentinel */}
                    <div ref={sentinelRef} className="h-1 w-full" />
                    {isLoadingMore && (
                        <div className="flex items-center justify-center py-4">
                            <p className="text-sm text-gray-500">Loading more videos...</p>
                        </div>
                    )}
                    {!hasMore && remainingVideos.length > 0 && (
                        <div className="flex items-center justify-center py-2">
                            <p className="text-xs text-gray-400">
                                You&apos;ve reached the end of the videos.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
