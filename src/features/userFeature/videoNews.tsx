"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { getFontStyle, getFontClassName } from "@/utils/font";
// ANIMATION: uncomment to re-enable per-item reveal
import RevealItem from "@/components/RevealItem";

// --- Types ---
export interface ContentBlock {
  subtitle: string | null;
  paragraph: string;
}

export interface EndImage {
  url: string;
  name: string | null;
}

export interface VideoNewsCategory {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface VideoNewsItem {
  id: number;
  category_id: number | null;
  author?: string;
  title: string;
  slug: string | null;
  cover: string | null;
  cover_name?: string | null;
  subtitle?: string | null;
  date_time_post: string;
  content_blocks?: ContentBlock[];
  middle_video_url: string | null;
  middle_video_name: string | null;
  end_images?: EndImage[] | null;
  created_at: string;
  updated_at: string;
  category: VideoNewsCategory | null;
}

// --- Component ---
interface VideoNewsProps {
  initialData?: VideoNewsItem[] | null;
  loading?: boolean;
}

export default function VideoNews({ initialData, loading: loadingProp }: VideoNewsProps = {}) {
  const loading = loadingProp ?? false;
  const displayVideos = initialData ?? [];

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

  const getYouTubeThumbnail = (url: string | null): string | null => {
    if (!url) return null;
    let videoId: string | null = null;
    const youtuBeMatch = url.match(/(?:youtu\.be\/)([^&\n?#]+)/);
    if (youtuBeMatch) videoId = youtuBeMatch[1].split("&")[0].split("?")[0].trim();
    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=)([^&\n?#]+)/);
    if (watchMatch) videoId = watchMatch[1].split("&")[0].split("?")[0].trim();
    const embedMatch = url.match(/(?:youtube\.com\/embed\/)([^&\n?#]+)/);
    if (embedMatch) videoId = embedMatch[1].split("&")[0].split("?")[0].trim();
    const shortsMatch = url.match(/(?:youtube\.com\/shorts\/)([^&\n?#]+)/);
    if (shortsMatch) videoId = shortsMatch[1].split("&")[0].split("?")[0].trim();
    // Use hqdefault (480p) instead of maxresdefault to reduce memory
    if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    return null;
  };

  const getDisplayImage = (video: VideoNewsItem): string | null => {
    if (video.cover) return video.cover;
    if (video.middle_video_url) return getYouTubeThumbnail(video.middle_video_url);
    return null;
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="h-7 bg-gray-200 rounded-[10px] w-40 mb-3 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(15)].map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg overflow-hidden animate-pulse"
            >
              <div className="relative w-full aspect-video bg-gray-200 rounded-lg" />
              <div className="p-4 space-y-2">
                <div className="flex flex-col space-y-2">
                  <div className="h-3 bg-gray-200 rounded-[10px] w-20" />
                  <div className="h-3 bg-gray-200 rounded-[10px] w-24" />
                </div>
                <div className="h-5 bg-gray-200 rounded-[10px] w-full" />
                <div className="h-5 bg-gray-200 rounded-[10px] w-3/4" />
                <div className="h-4 bg-gray-200 rounded-[10px] w-full" />
                <div className="h-4 bg-gray-200 rounded-[10px] w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (displayVideos.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">No videos available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2
        className={`text-xl font-bold text-[#085C9C] mb-3 ${getFontClassName("News Video")}`}
        style={getFontStyle("News Video")}
      >
        News Video
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayVideos.map((video) => {
          const displayImage = getDisplayImage(video);
          return (
            <Link
              key={video.id}
              href={`/news/v-${video.id}`}
              className="bg-white rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow block"
            >
              <div className="relative w-full aspect-video bg-gray-200 group">
                {displayImage && (
<img
                  src={displayImage}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-opacity-30 group-hover:bg-opacity-40 transition-all">
                  <div className="w-16 h-16 rounded-full bg-[#ffffff]/50 bg-opacity-90 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play
                      className="w-8 h-8 text-[#ffffff] ml-1"
                      fill="currentColor"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <div className="flex flex-col space-y-2">
                  {video.category && (
                    <span
                      className={`text-xs font-semibold text-[#1D2229] underline decoration-[#085C9C] decoration-2 underline-offset-3 uppercase ${getFontClassName(video.category.name)}`}
                      style={getFontStyle(video.category.name)}
                    >
                      {video.category.name}
                    </span>
                  )}
                  <p
                    className="text-xs font-medium font-poppins"
                    style={{ color: "rgba(29, 34, 41, 0.6784)" }}
                  >
                    {formatDate(video.created_at)}
                  </p>
                </div>
                <h2
                  className={`text-base font-semibold text-gray-900 line-clamp-2 leading-tight ${getFontClassName(video.title)}`}
                  style={getFontStyle(video.title)}
                >
                  {video.title}
                </h2>
                {video.content_blocks &&
                  video.content_blocks.length > 0 &&
                  video.content_blocks[0].paragraph && (
                    <p
                      className={`text-sm text-gray-600 line-clamp-2 ${getFontClassName(video.content_blocks[0].paragraph)}`}
                      style={getFontStyle(video.content_blocks[0].paragraph)}
                    >
                      {video.content_blocks[0].paragraph}
                    </p>
                  )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
