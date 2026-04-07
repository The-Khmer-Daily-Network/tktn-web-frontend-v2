import { getApiUrl, isApiConfigured } from "@/lib/api-url";
import { getAdminHeaders } from "@/services/auth";
import type {
  Article,
  ArticleContentBlock,
  ArticleEndImage,
  ArticlesResponse,
} from "@/types/article";

export interface ArticleByIdResponse {
  success: boolean;
  data: Article;
}

/** Params for creating an article (admin POST /admin/articles). */
export interface ArticleCreateParams {
  category_id?: number | null;
  user_id: number;
  title: string;
  slug?: string | null;
  cover?: string | null;
  cover_name?: string | null;
  subtitle?: string | null;
  date_time_post?: string;
  content_blocks?: ArticleContentBlock[];
  middle_image_url?: string | null;
  middle_image_name?: string | null;
  end_images?: ArticleEndImage[];
}

/** Params for updating an article (admin PUT /admin/articles/{id}). */
export interface ArticleUpdateParams {
  category_id?: number | null;
  user_id?: number;
  title?: string;
  slug?: string | null;
  cover?: string | null;
  cover_name?: string | null;
  subtitle?: string | null;
  date_time_post?: string;
  content_blocks?: ArticleContentBlock[];
  middle_image_url?: string | null;
  middle_image_name?: string | null;
  end_images?: ArticleEndImage[];
}

export interface ArticleCreateResponse {
  success: boolean;
  message: string;
  data: Article;
}

export interface ArticleUpdateResponse {
  success: boolean;
  message: string;
  data: Article;
}

export interface ArticleDeleteResponse {
  success: boolean;
  message: string;
}

if (!isApiConfigured()) {
  console.warn(
    "NEXT_PUBLIC_API_BASE_URL is not defined in environment variables",
  );
}

export interface GetArticlesOptions {
  page?: number;
  per_page?: number;
  /** Search in title and subtitle (backend: ?search= or ?q=) */
  search?: string;
}

/**
 * Fetch articles (GET only).
 * @param categoryId - Optional category ID to filter by (backend includes main + subcategories when applicable)
 * @param options - Optional pagination: page, per_page (default 15, max 100)
 */
export async function getArticles(
  categoryId?: number,
  options?: GetArticlesOptions,
): Promise<ArticlesResponse> {
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
  const url = getApiUrl("/articles" + (query ? `?${query}` : ""));

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
      `Failed to fetch articles: ${response.status} ${response.statusText}. ${errorText}`,
    );
  }

  return response.json();
}

/**
 * Fetch a single article by ID (GET /articles/{id}).
 * Use this for the news detail page (/news/[id]).
 */
export async function getArticleById(id: number): Promise<ArticleByIdResponse> {
  const url = getApiUrl(`/articles/${id}`);
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
      `Failed to fetch article: ${response.status} ${response.statusText}. ${errorText}`,
    );
  }
  return response.json();
}

const ADMIN_ARTICLES_BASE = "/admin/articles";

/**
 * Admin: list articles. Uses public GET /articles?page=1&per_page=30 (same backend index as admin).
 */
export async function getAdminArticles(
  categoryId?: number,
  options?: GetArticlesOptions,
): Promise<ArticlesResponse> {
  const page = options?.page ?? 1;
  const perPage = options?.per_page ?? 30;
  return getArticles(categoryId, { ...options, page, per_page: perPage });
}

/**
 * Admin: create article (POST /admin/articles).
 */
export async function createArticle(
  params: ArticleCreateParams,
): Promise<ArticleCreateResponse> {
  const url = getApiUrl(ADMIN_ARTICLES_BASE);
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
      `Failed to create article: ${response.status} ${response.statusText}. ${errorText}`,
    );
  }

  return response.json();
}

/**
 * Admin: update article (PUT /admin/articles/{id}).
 */
export async function updateArticle(
  id: number,
  params: ArticleUpdateParams,
): Promise<ArticleUpdateResponse> {
  const url = getApiUrl(`${ADMIN_ARTICLES_BASE}/${id}`);
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
      `Failed to update article: ${response.status} ${response.statusText}. ${errorText}`,
    );
  }

  return response.json();
}

/**
 * Admin: delete article (DELETE /admin/articles/{id}).
 */
export async function deleteArticle(
  id: number,
): Promise<ArticleDeleteResponse> {
  const url = getApiUrl(`${ADMIN_ARTICLES_BASE}/${id}`);
  const response = await fetch(url, {
    method: "DELETE",
    headers: getAdminHeaders(),
    credentials: "omit",
    mode: "cors",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to delete article: ${response.status} ${response.statusText}. ${errorText}`,
    );
  }

  return response.json();
}
