export interface ContentImage {
  id: number;
  image_url: string;
  title: string;
  original_name: string;
  created_at: string;
  updated_at: string;
}

export interface ContentImagePaginationInfo {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface ContentImageResponse {
  success: boolean;
  data: ContentImage[];
  pagination?: ContentImagePaginationInfo;
}

export interface ContentImageDeleteResponse {
  success: boolean;
  message: string;
}

export interface UploadContentImageResponse {
  success: boolean;
  message: string;
  data: ContentImage | ContentImage[];
  warnings?: string[];
}
