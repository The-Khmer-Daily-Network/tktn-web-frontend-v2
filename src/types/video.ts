export interface VideoContentBlock {
  subtitle: string | null;
  paragraph: string;
}

export interface VideoEndImage {
  url: string;
  name: string | null;
}

export interface VideoCategory {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: number;
  category_id: number | null;
  user_id?: number | null;
  author: string;
  title: string;
  slug: string | null;
  cover: string | null;
  cover_name: string | null;
  subtitle: string | null;
  date_time_post: string;
  content_blocks: VideoContentBlock[];
  middle_image_url: string | null;
  middle_image_name: string | null;
  middle_video_url: string | null;
  middle_video_name: string | null;
  end_images: VideoEndImage[];
  created_at: string;
  updated_at: string;
  category: VideoCategory | null;
}

export interface VideosResponse {
  success: boolean;
  data: Video[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}

export interface VideoByIdResponse {
  success: boolean;
  data: Video;
}
