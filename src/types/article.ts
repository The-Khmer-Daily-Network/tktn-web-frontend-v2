export interface ArticleContentBlock {
  subtitle: string | null;
  paragraph: string;
}

export interface ArticleEndImage {
  url: string;
  name: string | null;
}

export interface ArticleCategory {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Article {
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
  content_blocks: ArticleContentBlock[];
  middle_image_url: string | null;
  middle_image_name: string | null;
  end_images: ArticleEndImage[];
  created_at: string;
  updated_at: string;
  category: ArticleCategory | null;
}

export interface ArticlesResponse {
  success: boolean;
  data: Article[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}
