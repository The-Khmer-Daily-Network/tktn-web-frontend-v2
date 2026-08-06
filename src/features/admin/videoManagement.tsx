"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { getAdminVideos, deleteVideo } from "@/services/video";
import { getStoredUser } from "@/services/auth";
import type { Video } from "@/types/video";

const PER_PAGE = 30;

export default function VideoManagement() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [meta, setMeta] = useState<{
    current_page: number;
    last_page: number;
    total: number;
  }>({ current_page: 1, last_page: 1, total: 0 });

  const currentUser = getStoredUser();
  const isSMEUser = currentUser?.role === "SME";
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchData(1);
  }, []);

  const fetchData = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const videosResponse = await getAdminVideos(undefined, {
        page,
        per_page: PER_PAGE,
      });
      setVideos(videosResponse.data);
      setCurrentPage(videosResponse.meta.current_page);
      setMeta({
        current_page: videosResponse.meta.current_page,
        last_page: videosResponse.meta.last_page,
        total: videosResponse.meta.total,
      });
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > meta.last_page) return;
    fetchData(page);
  };

  const handleCreateVideo = () => {
    router.push("/videoManagement/create");
  };

  const handleEditVideo = (video: Video) => {
    const canManage =
      isSMEUser || (!!currentUser?.id && video.user_id === currentUser.id);
    if (!canManage) return;
    router.push(`/videoManagement/${video.id}/edit`);
  };

  const handleDelete = async (id: number) => {
    const target = videos.find((v) => v.id === id);
    const canManage =
      !!target &&
      (isSMEUser || (!!currentUser?.id && target.user_id === currentUser.id));
    if (!canManage) return;
    if (!confirm("Are you sure you want to delete this video?")) return;

    try {
      setDeletingId(id);
      await deleteVideo(id);
      await fetchData(currentPage);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete video");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600">Loading videos...</p>
      </div>
    );
  }

  if (error && videos.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <p className="mb-4 text-red-600">Error: {error}</p>
        <button
          onClick={() => fetchData(1)}
          className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col">
      <div className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Video Management
          </h2>
          <button
            onClick={handleCreateVideo}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus size={16} />
            Add Video
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <p className="text-sm text-yellow-800">{error}</p>
          </div>
        )}

        {videos.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="mb-4 text-gray-500">No videos found.</p>
              <button
                onClick={handleCreateVideo}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Create Your First Video
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
              <div className="grid grid-cols-[1fr_2fr_2fr_1.5fr_1.5fr_2fr_2fr] items-center gap-4 text-xs font-semibold tracking-wider text-gray-700 uppercase">
                <div className="text-center">#</div>
                <div>Cover Image</div>
                <div>Title</div>
                <div>Category</div>
                <div>Author</div>
                <div>Upload Date</div>
                <div className="text-center">Actions</div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {videos.map((video, index) => (
                <div
                  key={video.id}
                  className="px-6 py-2 transition-colors hover:bg-gray-50"
                >
                  <div className="grid grid-cols-[1fr_2fr_2fr_1.5fr_1.5fr_2fr_2fr] items-center gap-4">
                    <div className="text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {(meta.current_page - 1) * PER_PAGE + index + 1}
                      </span>
                    </div>

                    <div>
                      {video.cover ? (
                        <div className="relative h-20 w-30 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                          <img
                            src={video.cover}
                            alt="Cover"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-md border border-gray-200 bg-gray-100">
                          <span className="text-xs text-gray-400">No Cover</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">
                        {video.title}
                      </h3>
                      {video.subtitle && (
                        <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                          {video.subtitle}
                        </p>
                      )}
                    </div>

                    <div>
                      {video.category ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          {video.category.name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">No category</span>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-gray-900">{video.author}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-600">
                        {formatDate(video.created_at)}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-center gap-2">
                        {(() => {
                          const canManage =
                            isSMEUser ||
                            (!!currentUser?.id &&
                              video.user_id === currentUser.id);
                          return (
                            <>
                              <button
                                onClick={() => handleEditVideo(video)}
                                disabled={!canManage}
                                className={`rounded-lg p-2 transition-colors ${
                                  canManage
                                    ? "cursor-pointer text-blue-600 hover:bg-blue-50"
                                    : "cursor-not-allowed text-gray-400 opacity-60"
                                }`}
                                title={
                                  canManage
                                    ? "Edit"
                                    : "Only owner or SME can edit"
                                }
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(video.id)}
                                disabled={deletingId === video.id || !canManage}
                                className={`rounded-lg p-2 transition-colors ${
                                  canManage
                                    ? "cursor-pointer text-red-600 hover:bg-red-50"
                                    : "cursor-not-allowed text-gray-400 opacity-60"
                                } disabled:opacity-50`}
                                title={
                                  canManage
                                    ? "Delete"
                                    : "Only owner or SME can delete"
                                }
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {meta.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4">
                <p className="text-sm text-gray-600">
                  Page {meta.current_page} of {meta.last_page}
                  <span className="ml-2 text-gray-500">({meta.total} total)</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(meta.current_page - 1)}
                    disabled={meta.current_page <= 1 || loading}
                    className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(
                      (p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => goToPage(p)}
                          disabled={loading}
                          className={`min-w-[2.25rem] cursor-pointer rounded-lg py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            p === meta.current_page
                              ? "bg-blue-600 text-white"
                              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {p}
                        </button>
                      ),
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => goToPage(meta.current_page + 1)}
                    disabled={meta.current_page >= meta.last_page || loading}
                    className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
