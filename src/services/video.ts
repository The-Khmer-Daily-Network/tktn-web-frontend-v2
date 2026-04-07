import type {
  VideosResponse,
  Video,
  VideoByIdResponse,
  VideoContentBlock,
  VideoEndImage,
} from "@/types/video";
import { getAdminHeaders } from "@/services/auth";

export interface VideoCreateParams {
  category_id?: number | null;
  user_id: number;
  title: string;
  slug?: string | null;
  cover?: string | null;
  cover_name?: string | null;
  subtitle?: string | null;
  date_time_post?: string;
  content_blocks?: VideoContentBlock[];
  middle_image_url?: string | null;
  middle_image_name?: string | null;
  middle_video_url?: string | null;
  middle_video_name?: string | null;
  end_images?: VideoEndImage[];
}

export interface VideoUpdateParams {
  category_id?: number | null;
  user_id?: number;
  title?: string;
  slug?: string | null;
  cover?: string | null;
  cover_name?: string | null;
  subtitle?: string | null;
  date_time_post?: string;
  content_blocks?: VideoContentBlock[];
  middle_image_url?: string | null;
  middle_image_name?: string | null;
  middle_video_url?: string | null;
  middle_video_name?: string | null;
  end_images?: VideoEndImage[];
}

export interface VideoCreateResponse {
  success: boolean;
  message: string;
  data: Video;
}

export interface VideoUpdateResponse {
  success: boolean;
  message: string;
  data: Video;
}

export interface VideoDeleteResponse {
  success: boolean;
  message: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  console.warn(
    "NEXT_PUBLIC_API_BASE_URL is not defined in environment variables",
  );
}

function getApiUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not defined in environment variables",
    );
  }
  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const apiPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${apiPath}`;
}

export interface GetVideosOptions {
  page?: number;
  per_page?: number;
  search?: string;
}

export async function getVideos(
  categoryId?: number,
  options?: GetVideosOptions,
): Promise<VideosResponse> {
  const params = new URLSearchParams();
  if (categoryId !== undefined) {
    params.set("category_id", String(categoryId));
  }
  if (options?.page !== undefined) {
    params.set("page", String(options.page));
  }
  if (options?.per_page !== undefined) {
    params.set("per_page", String(options.per_page));
  }
  const searchTerm = options?.search?.trim();
  if (searchTerm) {
    params.set("search", searchTerm);
  }
  const query = params.toString();
  const url = getApiUrl("/videos" + (query ? `?${query}` : ""));

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "omit",
    mode: "cors",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch videos: ${response.status} ${response.statusText}. ${errorText}`,
    );
  }

  return response.json();
}

export async function getVideoById(id: number): Promise<VideoByIdResponse> {
  const url = getApiUrl(`/videos/${id}`);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "omit",
    mode: "cors",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch video: ${response.status} ${response.statusText}. ${errorText}`,
    );
  }
  return response.json();
}

const ADMIN_VIDEOS_BASE = "/admin/videos";

/**
 * Admin: list videos. Uses public GET /videos?page=1&per_page=30 (same backend index as admin).
 */
export async function getAdminVideos(
  categoryId?: number,
  options?: GetVideosOptions,
): Promise<VideosResponse> {
  const page = options?.page ?? 1;
  const perPage = options?.per_page ?? 30;
  return getVideos(categoryId, { ...options, page, per_page: perPage });
}

/**
 * Admin: create video (POST /admin/videos).
 */
export async function createVideo(
  params: VideoCreateParams,
): Promise<VideoCreateResponse> {
  const url = getApiUrl(ADMIN_VIDEOS_BASE);
  const response = await fetch(url, {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify(params),
    credentials: "omit",
    mode: "cors",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create video: ${response.status} ${response.statusText}. ${errorText}`,
    );
  }

  return response.json();
}

/**
 * Admin: update video (PUT /admin/videos/{id}).
 */
export async function updateVideo(
  id: number,
  params: VideoUpdateParams,
): Promise<VideoUpdateResponse> {
  const url = getApiUrl(`${ADMIN_VIDEOS_BASE}/${id}`);
  const response = await fetch(url, {
    method: "PUT",
    headers: getAdminHeaders(),
    body: JSON.stringify(params),
    credentials: "omit",
    mode: "cors",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to update video: ${response.status} ${response.statusText}. ${errorText}`,
    );
  }

  return response.json();
}

/**
 * Admin: delete video (DELETE /admin/videos/{id}).
 */
export async function deleteVideo(
  id: number,
): Promise<VideoDeleteResponse> {
  const url = getApiUrl(`${ADMIN_VIDEOS_BASE}/${id}`);
  const response = await fetch(url, {
    method: "DELETE",
    headers: getAdminHeaders(),
    credentials: "omit",
    mode: "cors",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to delete video: ${response.status} ${response.statusText}. ${errorText}`,
    );
  }

  return response.json();
}
