import { categoryNameToSlug } from "@/utils/slug";
import { getFirstSentenceFromContent } from "@/utils/article";

type ContentBlock = { subtitle?: string | null; paragraph?: string };

type ArticleForJsonLd = {
  title: string;
  subtitle: string | null;
  cover: string | null;
  author?: string;
  category?: { name: string } | null;
  date_time_post?: string;
  created_at?: string;
  updated_at?: string;
  middle_video_url?: string | null;
  middle_video_name?: string | null;
  content_blocks?: ContentBlock[] | null;
};

function getYouTubeThumbnail(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&\n?#]+)/);
  return match ? `https://img.youtube.com/vi/${match[1].split("&")[0].trim()}/maxresdefault.jpg` : null;
}

function isYouTubeUrl(url: string | null): boolean {
  return !!url && /youtube\.com|youtu\.be/.test(url);
}

export default function ArticleJsonLd({
  news,
  numericId,
  isVideoRoute,
  siteBase,
  imageUrl,
}: {
  news: ArticleForJsonLd;
  numericId: number;
  isVideoRoute: boolean;
  siteBase: string;
  imageUrl: string;
}) {
  const articleUrl = `${siteBase}/news/${isVideoRoute ? `v-${numericId}` : numericId}`;
  const descriptionFallback = getFirstSentenceFromContent(news.content_blocks) || news.title;
  const description = news.subtitle || descriptionFallback;

  const newsArticleSchema = {
    "@type": "NewsArticle",
    headline: news.title,
    description,
    keywords: [news.title, description, news.category?.name, "The Khmer Today", "Cambodia news", "Khmer news"]
      .filter(Boolean)
      .join(", "),
    image: imageUrl,
    datePublished: news.date_time_post || news.created_at,
    dateModified: news.updated_at || news.date_time_post || news.created_at,
    author: { "@type": "Person" as const, name: news.author || "The Khmer Today" },
    publisher: {
      "@type": "Organization" as const,
      name: "The Khmer Today",
      logo: { "@type": "ImageObject" as const, url: `${siteBase}/assets/TKDN_Logo/TKTN_Logo_Square.png` },
    },
    mainEntityOfPage: { "@type": "WebPage" as const, "@id": articleUrl },
    ...(news.category && { articleSection: news.category.name }),
  };

  const breadcrumbItems = [
    { "@type": "ListItem" as const, position: 1, name: "Home", item: siteBase },
    ...(news.category
      ? [
          {
            "@type": "ListItem" as const,
            position: 2,
            name: news.category.name,
            item: `${siteBase}/news/${categoryNameToSlug(news.category.name).toLowerCase()}`,
          },
          { "@type": "ListItem" as const, position: 3, name: news.title, item: articleUrl },
        ]
      : [{ "@type": "ListItem" as const, position: 2, name: news.title, item: articleUrl }]),
  ];

  const breadcrumbSchema = {
    "@type": "BreadcrumbList" as const,
    itemListElement: breadcrumbItems,
  };

  const videoSchema =
    news.middle_video_url ?
      {
        "@type": "VideoObject" as const,
        name: news.middle_video_name || news.title,
        description,
        thumbnailUrl: getYouTubeThumbnail(news.middle_video_url) || imageUrl,
        uploadDate: news.date_time_post || news.created_at,
        ...(isYouTubeUrl(news.middle_video_url)
          ? { embedUrl: news.middle_video_url }
          : { contentUrl: news.middle_video_url }),
        publisher: {
          "@type": "Organization" as const,
          name: "The Khmer Today",
          logo: { "@type": "ImageObject" as const, url: `${siteBase}/assets/TKDN_Logo/TKTN_Logo_Square.png` },
        },
      }
    : null;

  const graph = [newsArticleSchema, breadcrumbSchema, ...(videoSchema ? [videoSchema] : [])];
  const structuredData = { "@context": "https://schema.org", "@graph": graph };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
