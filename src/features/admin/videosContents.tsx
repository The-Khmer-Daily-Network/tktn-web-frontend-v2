"use client";

import type React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
import { getContentVideos, deleteContentVideo } from "@/services/contentVideo";
import type {
  ContentVideo,
  ContentVideoPaginationInfo,
} from "@/types/contentVideo";
import UploadVideoModal from "@/components/admin/UploadVideoModal";

const PER_PAGE = 30;

export default function VideosContents() {
  const [videos, setVideos] = useState<ContentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] =
    useState<ContentVideoPaginationInfo | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<number | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<ContentVideo | null>(null);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchVideos(1);
  }, []);

  const getVideoMimeType = (url: string | undefined | null): string => {
    if (!url) return "video/mp4";
    const lower = url.toLowerCase();
    if (lower.endsWith(".webm")) return "video/webm";
    if (lower.endsWith(".ogg") || lower.endsWith(".ogv")) return "video/ogg";
    if (lower.endsWith(".mov") || lower.endsWith(".qt"))
      return "video/quicktime";
    if (lower.endsWith(".avi")) return "video/x-msvideo";
    if (lower.endsWith(".mkv")) return "video/x-matroska";
    return "video/mp4";
  };

  const fetchVideos = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getContentVideos({
        page,
        per_page: PER_PAGE,
      });
      // Ensure video URLs are properly formatted (fix escaped slashes)
      const cleanedVideos = response.data.map((video: ContentVideo) => ({
        ...video,
        video_url: video.video_url.replace(/\\\//g, "/"),
      }));
      setVideos(cleanedVideos);
      if (response.pagination) {
        setPagination(response.pagination);
        setCurrentPage(response.pagination.current_page);
      } else {
        setPagination(null);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error("Error fetching videos:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch content videos",
      );
    } finally {
      setLoading(false);
    }
  };

  const totalItems = pagination?.total ?? videos.length;
  const startIndex = pagination?.from ?? (videos.length === 0 ? 0 : 1);
  const endIndex = pagination?.to ?? videos.length;
  const totalPages =
    pagination?.last_page ?? Math.max(1, Math.ceil(videos.length / PER_PAGE));

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this video?")) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteContentVideo(id);
      await fetchVideos(currentPage);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete content video",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpload = () => {
    setIsUploadModalOpen(true);
  };

  const handleUploadSuccess = () => {
    // Refresh the videos list after successful upload
    fetchVideos(currentPage);
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    fetchVideos(page);
  };

  const handleOpenPlayer = (video: ContentVideo) => {
    setActiveVideo(video);
    setIsPlayerOpen(true);
  };

  const handleClosePlayer = () => {
    setIsPlayerOpen(false);
    setActiveVideo(null);
    setPlayingVideoId(null);
  };

  const handlePlayActiveVideo = async () => {
    const video = activeVideoRef.current;
    if (!video || !activeVideo) return;

    try {
      // Ensure we only have this video playing
      Object.values(videoRefs.current).forEach((v) => {
        if (v && v !== video) {
          v.pause();
        }
      });

      if (!video.paused) {
        video.pause();
        setPlayingVideoId(null);
      } else {
        await video.play();
        setPlayingVideoId(activeVideo.id);
      }
    } catch (err) {
      console.error("Error playing active video:", err);
    }
  };

  const handleVideoEnded = (videoId: number) => {
    setPlayingVideoId(null);
  };

  const handleVideoPause = (videoId: number) => {
    if (playingVideoId === videoId) {
      setPlayingVideoId(null);
    }
  };

  const handleVideoLoadStart = (videoId: number) => {
    // no-op for now; kept for potential loading indicators
    setPlayingVideoId(videoId);
  };

  const handleVideoLoadedData = (videoId: number) => {
    setPlayingVideoId(videoId);
  };

  const handleVideoError = (
    videoId: number,
    event?: React.SyntheticEvent<HTMLVideoElement, Event>,
  ) => {
    const video = videoRefs.current[videoId];
    const videoUrl = videos.find((v) => v.id === videoId)?.video_url;

    console.error("Video failed to load:", {
      videoId,
      videoUrl,
      error: event?.currentTarget?.error,
      errorCode: event?.currentTarget?.error?.code,
      errorMessage: event?.currentTarget?.error?.message,
      networkState: video?.networkState,
      readyState: video?.readyState,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-600">Loading content videos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={() => fetchVideos(1)}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (videos.length === 0 && !loading) {
    return (
      <div className="relative h-screen flex flex-col">
        {/* Sticky Header with Upload Button */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Content Videos
            </h2>
            <button
              type="button"
              onClick={handleUpload}
              className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm text-sm"
            >
              <Plus size={16} />
              Upload Video
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500">No content videos found.</p>
          </div>
        </div>

        {/* Upload Modal */}
        <UploadVideoModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadSuccess={handleUploadSuccess}
        />
      </div>
    );
  }

  return (
    <div className="relative h-screen flex flex-col">
      {/* Sticky Header with Upload Button */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-2 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Content Videos
            </h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Showing {startIndex}-{endIndex} of {totalItems} videos
            </p>
          </div>
          <button
            type="button"
            onClick={handleUpload}
            className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm text-xs"
          >
            <Plus size={14} />
            Upload Video
          </button>
        </div>
      </div>

      {/* Video Grid - No scroll, fits exactly on screen */}
      <div className="flex-1 p-3 overflow-hidden">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-2.5 h-full">
          {videos.map((video) => (
            <div
              key={video.id}
              className="relative group overflow-hidden transition-shadow cursor-pointer"
            >
              <div
                className="relative bg-black shrink-0 overflow-hidden w-[215px] max-w-full aspect-100/53 rounded-md"
                onClick={() => handleOpenPlayer(video)}
              >
                <video
                  ref={(el) => {
                    videoRefs.current[video.id] = el;
                  }}
                  className="w-full h-full object-cover opacity-80"
                  muted
                  playsInline
                  preload="metadata"
                  onLoadStart={() => handleVideoLoadStart(video.id)}
                  onLoadedData={() => handleVideoLoadedData(video.id)}
                  onError={(e) => handleVideoError(video.id, e)}
                  onEnded={() => handleVideoEnded(video.id)}
                  onPause={() => handleVideoPause(video.id)}
                  onPlay={() => setPlayingVideoId(video.id)}
                >
                  <source
                    src={video.video_url}
                    type={getVideoMimeType(video.video_url)}
                  />
                </video>
                {/* Play button overlay */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/40 rounded-full p-2 group-hover:bg-black/60 transition-colors">
                    <Play
                      size={20}
                      className="text-white ml-0.5"
                      fill="currentColor"
                    />
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(video.id);
                  }}
                  disabled={deletingId === video.id}
                  className="cursor-pointer absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg z-20"
                  aria-label="Delete video"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Pagination */}
      {totalPages > 1 && (
        <div className="sticky bottom-0 z-50 bg-white border-t border-gray-200 shadow-lg">
          <div className="px-4 py-2 flex items-center justify-between">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => {
                // Show first page, last page, current page, and pages around current
                const showPage =
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1);

                if (!showPage) {
                  // Show ellipsis
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <span key={page} className="px-1.5 text-gray-500 text-xs">
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`cursor-pointer px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <UploadVideoModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Video Player Modal */}
      {isPlayerOpen && activeVideo && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClosePlayer}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-3xl mx-4 bg-gray-950 rounded-xl shadow-2xl border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <div className="min-w-0 mr-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Playing video
                </p>
                <h3 className="text-sm font-medium text-white truncate">
                  {activeVideo.title || activeVideo.original_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClosePlayer}
                className="cursor-pointer inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="relative bg-black aspect-video w-full">
              <video
                key={activeVideo.id}
                controls
                playsInline
                className="w-full h-full object-contain bg-black"
                onError={(e) => handleVideoError(activeVideo.id, e)}
              >
                <source
                  src={activeVideo.video_url}
                  type={getVideoMimeType(activeVideo.video_url)}
                />
              </video>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
