import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

function normalizePaths(paths: unknown): string[] {
  if (!Array.isArray(paths)) return [];
  return paths
    .filter((path): path is string => typeof path === "string")
    .map((path) => path.trim())
    .filter((path) => path.startsWith("/news/") && path.length <= 500);
}

export async function POST(request: Request) {
  let payload: { paths?: unknown } = {};
  try {
    payload = (await request.json()) as { paths?: unknown };
  } catch {
    payload = {};
  }

  const pathsToRevalidate = Array.from(new Set(normalizePaths(payload.paths)));

  for (const path of pathsToRevalidate) {
    revalidatePath(path, "page");
    const slug = path.replace(/^\/news\//, "");
    if (slug) {
      revalidatePath(`/api/news/${encodeURIComponent(slug)}/og-image`);
    }
  }

  revalidatePath("/home", "page");
  revalidatePath("/latest", "page");
  revalidatePath("/sitemap.xml");

  return NextResponse.json({
    success: true,
    revalidated: [...pathsToRevalidate, "/home", "/latest", "/sitemap.xml"],
  });
}
