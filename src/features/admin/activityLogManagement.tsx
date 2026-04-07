"use client";

import { useState, useEffect } from "react";
import { getActivityLogs } from "@/services/activityLog";
import type { ActivityLog as ActivityLogType } from "@/types/activityLog";
import { useAuth } from "@/contexts/AuthContext";

const PER_PAGE_OPTIONS = [30, 50, 100] as const;

/** Human-readable label for action */
function actionLabel(action: string): string {
  const map: Record<string, string> = {
    "user.create": "Create user",
    "user.delete": "Delete user",
    "article.create": "Create article",
    "article.update": "Update article",
    "article.delete": "Delete article",
    "video.create": "Create video",
    "video.update": "Update video",
    "video.delete": "Delete video",
    "content_image.upload": "Upload content image(s)",
    "content_image.delete": "Delete content image",
    "content_cover.upload": "Upload cover image(s)",
    "content_cover.delete": "Delete cover image",
    "content_video.upload": "Upload content video(s)",
    "content_video.delete": "Delete content video",
  };
  return map[action] ?? action;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

export default function ActivityLogManagement() {
  const { isUserSME } = useAuth();
  const [logs, setLogs] = useState<ActivityLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState<(typeof PER_PAGE_OPTIONS)[number]>(50);
  const [meta, setMeta] = useState<{
    current_page: number;
    last_page: number;
    total: number;
  }>({ current_page: 1, last_page: 1, total: 0 });

  const fetchLogs = async (page: number, perPageValue: number = perPage) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getActivityLogs({ page, per_page: perPageValue });
      setLogs(res.data);
      setMeta({
        current_page: res.meta.current_page,
        last_page: res.meta.last_page,
        total: res.meta.total,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, perPage);
  }, [perPage]);

  const goToPage = (page: number) => {
    if (page < 1 || page > meta.last_page) return;
    setCurrentPage(page);
    fetchLogs(page);
  };

  if (!isUserSME) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <p className="font-medium">Access restricted</p>
          <p className="text-sm mt-1">
            Only SME role can access Activity Log.
          </p>
        </div>
      </div>
    );
  }

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-600">Loading activity logs...</p>
      </div>
    );
  }

  if (error && logs.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-0">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3">
          <h2 className="text-xl font-semibold text-gray-900">
            Activity Log
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Read-only history of who did what. No edit or delete in this view.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No activity logs yet.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700">#</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Date & time</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">User</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Action</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600">
                        {log.id}
                      </td>
                      <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-2 text-gray-900 font-medium">
                        {log.actor_username ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-900">
                        {actionLabel(log.action)}
                      </td>
                      <td className="px-4 py-2 text-gray-600 max-w-xs">
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <span className="text-xs break-words">
                            {JSON.stringify(log.metadata)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta.last_page > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-gray-600">
                    Page {meta.current_page} of {meta.last_page}
                    <span className="ml-2 text-gray-500">({meta.total} total)</span>
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span>Rows per page:</span>
                    <select
                      value={perPage}
                      onChange={(e) => {
                        const next = Number(e.target.value) as (typeof PER_PAGE_OPTIONS)[number];
                        setCurrentPage(1);
                        setPerPage(next);
                      }}
                      className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {PER_PAGE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(meta.current_page - 1)}
                    disabled={meta.current_page <= 1 || loading}
                    className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          className={`cursor-pointer min-w-[2.25rem] py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                            p === meta.current_page
                              ? "bg-blue-600 text-white"
                              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => goToPage(meta.current_page + 1)}
                    disabled={meta.current_page >= meta.last_page || loading}
                    className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
