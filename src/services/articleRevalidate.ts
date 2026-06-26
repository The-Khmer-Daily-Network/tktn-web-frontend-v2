export async function revalidateArticlePaths(paths: string[]): Promise<void> {
  const unique = Array.from(
    new Set(
      paths
        .map((p) => p.trim())
        .filter((p) => p.startsWith("/news/")),
    ),
  );
  if (unique.length === 0) return;

  try {
    await fetch("/api/admin/revalidate-article", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths: unique }),
    });
  } catch (error) {
    console.warn("Article cache revalidation failed:", error);
  }
}

export function getArticleRevalidatePath(articleId: number): string {
  return `/news/${articleId}`;
}

export function getVideoRevalidatePath(videoId: number): string {
  return `/news/v-${videoId}`;
}

export async function revalidateArticleAfterSave(articleId: number): Promise<void> {
  await revalidateArticlePaths([getArticleRevalidatePath(articleId)]);
}

export async function revalidateVideoAfterSave(videoId: number): Promise<void> {
  await revalidateArticlePaths([getVideoRevalidatePath(videoId)]);
}
