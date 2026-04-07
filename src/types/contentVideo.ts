export interface ContentVideo {
  id: number;
  video_url: string;
  title: string;
  original_name: string;
  created_at: string;
  updated_at: string;
}

export interface ContentVideoPaginationInfo {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface ContentVideoResponse {
  success: boolean;
  data: ContentVideo[];
  pagination?: ContentVideoPaginationInfo;
}

export interface ContentVideoDeleteResponse {
  success: boolean;
  message: string;
}

export interface UploadContentVideoResponse {
  success: boolean;
  message: string;
  data: ContentVideo | ContentVideo[];
  warnings?: string[];
}
