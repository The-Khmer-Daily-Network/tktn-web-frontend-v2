import { getApiUrl, isApiConfigured, readApiJson } from "@/lib/api-url";
import { getAdminActorHeaders, getAdminHeaders } from "@/services/auth";
import type {
  ContentVideo,
  ContentVideoDeleteResponse,
  ContentVideoResponse,
  UploadContentVideoResponse,
} from "@/types/contentVideo";
import { resolveMediaUrl } from "@/utils/resolveMediaUrl";

function normalizeContentVideo(video: ContentVideo): ContentVideo {
  return {
    ...video,
    video_url: resolveMediaUrl(video.video_url),
  };
}

function normalizeUploadVideoResponse(
  payload: UploadContentVideoResponse,
): UploadContentVideoResponse {
  const data = payload.data;
  return {
    ...payload,
    data: Array.isArray(data)
      ? data.map(normalizeContentVideo)
      : normalizeContentVideo(data),
  };
}

if (!isApiConfigured()) {
  console.warn(
    "NEXT_PUBLIC_API_BASE_URL is not defined in environment variables",
  );
}

export interface GetContentVideosOptions {
  page?: number;
  per_page?: number;
}

/**
 * Fetch content videos with optional pagination (?page=&per_page=).
 */
export async function getContentVideos(
  options?: GetContentVideosOptions,
): Promise<ContentVideoResponse> {
  try {
    const params = new URLSearchParams();
    if (options?.page !== undefined) {
      params.set("page", String(options.page));
    }
    if (options?.per_page !== undefined) {
      params.set("per_page", String(options.per_page));
    }
    const query = params.toString();
    const url = getApiUrl("/videos-content" + (query ? `?${query}` : ""));

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "omit",
      mode: "cors", // Explicitly set CORS mode
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch content videos: ${response.status} ${response.statusText}. ${errorText}`,
      );
    }

    // Get raw response text first to check for escaped slashes
    const responseText = await response.text();

    // Parse JSON
    const data = JSON.parse(responseText) as ContentVideoResponse;

    if (data.success && Array.isArray(data.data)) {
      data.data = data.data.map(normalizeContentVideo);
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(`Your file is higher than 2MB`);
    }
    throw error;
  }
}

/**
 * Delete a content video by ID
 */
export async function deleteContentVideo(
  id: number,
): Promise<ContentVideoDeleteResponse> {
  try {
    const url = getApiUrl(`/videos-content/${id}`);
    console.log("Deleting from:", url); // Debug log

    const response = await fetch(url, {
      method: "DELETE",
      headers: getAdminHeaders(),
      credentials: "omit",
      mode: "cors",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to delete content video: ${response.status} ${response.statusText}. ${errorText}`,
      );
    }

    return readApiJson(response);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(`Your file is higher than 2MB`);
    }
    throw error;
  }
}

/**
 * Upload a content video
 */
export interface UploadContentVideoParams {
  video: File;
  title?: string;
}

export async function uploadContentVideo({
  video,
  title,
}: UploadContentVideoParams): Promise<UploadContentVideoResponse> {
  try {
    const url = getApiUrl("/videos-content");

    // Validate file type (common video formats)
    const allowedTypes = [
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/x-msvideo",
      "video/webm",
    ];
    if (!allowedTypes.includes(video.type)) {
      throw new Error(
        "Only MP4, MPEG, MOV, AVI, and WebM video files are allowed",
      );
    }

    // Create FormData
    const formData = new FormData();

    // Backend expects video as array, so use video[0]
    formData.append("video[0]", video);

    // Add title if provided
    if (title && title.trim()) {
      formData.append("title", title.trim());
    }

    const response = await fetch(url, {
      method: "POST",
      headers: getAdminActorHeaders(),
      body: formData,
      credentials: "omit",
      mode: "cors",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to upload content video: ${response.status} ${response.statusText}. ${errorText}`,
      );
    }

    const payload = await readApiJson<UploadContentVideoResponse>(response);
    return normalizeUploadVideoResponse(payload);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        `Network error: Unable to connect to API. Please check if NEXT_PUBLIC_API_BASE_URL is set correctly and the API server is running.`,
      );
    }
    throw error;
  }
}

/**
 * Upload a content video via URL
 */
export interface UploadContentVideoByUrlParams {
  videoUrl: string;
  title?: string;
}

export async function uploadContentVideoByUrl({
  videoUrl,
  title,
}: UploadContentVideoByUrlParams): Promise<UploadContentVideoResponse> {
  try {
    const url = getApiUrl("/videos-content");

    // Validate URL format
    try {
      new URL(videoUrl);
    } catch {
      throw new Error("Invalid video URL format");
    }

    // Send as JSON since we're not uploading a file
    const requestBody: { video_url: string; title?: string } = {
      video_url: videoUrl,
    };

    if (title && title.trim()) {
      requestBody.title = title.trim();
    }

    const response = await fetch(url, {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify(requestBody),
      credentials: "omit",
      mode: "cors",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to upload content video URL: ${response.status} ${response.statusText}. ${errorText}`,
      );
    }

    const payload = await readApiJson<UploadContentVideoResponse>(response);
    return normalizeUploadVideoResponse(payload);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        `Network error: Unable to connect to API. Please check if NEXT_PUBLIC_API_BASE_URL is set correctly and the API server is running.`,
      );
    }
    throw error;
  }
}
