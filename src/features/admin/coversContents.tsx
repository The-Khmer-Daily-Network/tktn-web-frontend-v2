"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Trash2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { getContentCovers, deleteContentCover } from "@/services/contentCover";
import type {
  ContentCover,
  PaginationInfo,
} from "@/types/contentCover";
import UploadCoverModal from "@/components/admin/UploadCoverModal";

const PER_PAGE = 30;

export default function CoversContents() {
  const [covers, setCovers] = useState<ContentCover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchCovers(1);
  }, []);

  const fetchCovers = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getContentCovers({
        page,
        per_page: PER_PAGE,
      });
      setCovers(response.data);
      if (response.pagination) {
        setPagination(response.pagination);
        setCurrentPage(response.pagination.current_page);
      } else {
        setPagination(null);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error("Error fetching covers:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch content covers",
      );
    } finally {
      setLoading(false);
    }
  };

  const totalItems = pagination?.total ?? covers.length;
  const startIndex = pagination?.from ?? (covers.length === 0 ? 0 : 1);
  const endIndex = pagination?.to ?? covers.length;
  const totalPages =
    pagination?.last_page ?? Math.max(1, Math.ceil(covers.length / PER_PAGE));

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this image?")) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteContentCover(id);
      await fetchCovers(currentPage);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete content cover",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpload = () => {
    setIsUploadModalOpen(true);
  };

  const handleUploadSuccess = () => {
    // Refresh the covers list after successful upload
    fetchCovers(currentPage);
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    fetchCovers(page);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-600">Loading content covers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={() => fetchCovers(1)}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (covers.length === 0 && !loading) {
    return (
      <div className="relative h-screen flex flex-col">
        {/* Sticky Header with Upload Button */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Content Covers
            </h2>
            <button
              type="button"
              onClick={handleUpload}
              className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm text-sm"
            >
              <Plus size={16} />
              Upload Cover
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500">No content covers found.</p>
          </div>
        </div>

        {/* Upload Modal */}
        <UploadCoverModal
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
              Content Covers
            </h2>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Showing {startIndex}-{endIndex} of {totalItems} covers
            </p>
          </div>
          <button
            type="button"
            onClick={handleUpload}
            className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm text-xs"
          >
            <Plus size={14} />
            Upload Cover
          </button>
        </div>
      </div>

      {/* Image Grid - No scroll, fits exactly on screen */}
      <div className="flex-1 p-3 overflow-hidden">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(215px,1fr))] gap-2.5 h-full">
          {covers.map((cover) => (
            <div
              key={cover.id}
              className="relative group overflow-hidden transition-shadow"
            >
              <div className="relative bg-gray-100 shrink-0 w-[215px] max-w-full aspect-100/53">
                <Image
                  src={cover.image_url}
                  alt={cover.title}
                  fill
                  className="object-cover rounded-md"
                  sizes="215px"
                  loading="lazy"
                />
                <button
                  onClick={() => handleDelete(cover.id)}
                  disabled={deletingId === cover.id}
                  className="cursor-pointer absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  aria-label="Delete image"
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
      <UploadCoverModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
}
