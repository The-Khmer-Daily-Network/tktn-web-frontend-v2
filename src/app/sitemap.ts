import { MetadataRoute } from 'next';
import { categoryNameToSlug } from '@/utils/slug';

export const dynamic = 'force-dynamic';

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/?$/, '') + '/api';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thekhmertoday.news';

/**
 * Fetch all published articles for the sitemap.
 * Uses /articles with pagination and cache: 'no-store' so new content appears quickly.
 */
async function getAllNews() {
  if (!API_BASE_URL) {
    return [];
  }

  try {
    const baseUrl = API_BASE_URL.replace(/\/$/, '');
    const perPage = 100;
    let currentPage = 1;
    let lastPage = 1;
    const allArticles: any[] = [];

    do {
      const url = `${baseUrl}/articles?page=${currentPage}&per_page=${perPage}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        next: { revalidate: 300 },
      });

      if (!response.ok) {
        break;
      }

      const data = await response.json();
      if (!data?.success || !Array.isArray(data.data)) {
        break;
      }

      allArticles.push(...data.data);
      const meta = data.meta || {};
      lastPage = typeof meta.last_page === 'number' ? meta.last_page : currentPage;
      currentPage += 1;
    } while (currentPage <= lastPage);

    return allArticles;
  } catch (error) {
    console.error('Error fetching news for sitemap:', error);
    return [];
  }
}

/**
 * Fetch all published videos for the sitemap.
 * Uses /videos with pagination and cache: 'no-store'.
 */
async function getAllVideos() {
  if (!API_BASE_URL) {
    return [];
  }

  try {
    const baseUrl = API_BASE_URL.replace(/\/$/, '');
    const perPage = 100;
    let currentPage = 1;
    let lastPage = 1;
    const allVideos: any[] = [];

    do {
      const url = `${baseUrl}/videos?page=${currentPage}&per_page=${perPage}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        next: { revalidate: 300 },
      });

      if (!response.ok) {
        break;
      }

      const data = await response.json();
      if (!data?.success || !Array.isArray(data.data)) {
        break;
      }

      allVideos.push(...data.data);
      const meta = data.meta || {};
      lastPage = typeof meta.last_page === 'number' ? meta.last_page : currentPage;
      currentPage += 1;
    } while (currentPage <= lastPage);

    return allVideos;
  } catch (error) {
    console.error('Error fetching videos for sitemap:', error);
    return [];
  }
}

async function getCategories() {
  if (!API_BASE_URL) {
    return [];
  }

  try {
    const baseUrl = API_BASE_URL.replace(/\/$/, '');
    const url = `${baseUrl}/categories`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.categories || [];
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about-us`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/video`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // Fetch all news articles
  const allNews = await getAllNews();
  const newsPages: MetadataRoute.Sitemap = allNews.map((article: any) => ({
    url: `${baseUrl}/news/${article.id}`,
    lastModified: new Date(article.updated_at || article.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Fetch all video articles (video detail pages: /news/v-<id>)
  const allVideos = await getAllVideos();
  const videoPages: MetadataRoute.Sitemap = allVideos.map((video: any) => ({
    url: `${baseUrl}/news/v-${video.id}`,
    lastModified: new Date(video.updated_at || video.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Fetch categories
  const categories = await getCategories();
  const categoryPages: MetadataRoute.Sitemap = [];

  // Add main categories
  categories.forEach((category: any) => {
    const slug = categoryNameToSlug(category.name);
    categoryPages.push({
      url: `${baseUrl}/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    });

    // Add subcategories
    if (category.subcategories && category.subcategories.length > 0) {
      category.subcategories.forEach((subcategory: any) => {
        const subSlug = categoryNameToSlug(subcategory.name);
        categoryPages.push({
          url: `${baseUrl}/${subSlug}`,
          lastModified: new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.6,
        });
      });
    }
  });

  // Add latest (video already in staticPages)
  categoryPages.push({
    url: `${baseUrl}/latest`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  });

  return [...staticPages, ...newsPages, ...videoPages, ...categoryPages];
}
