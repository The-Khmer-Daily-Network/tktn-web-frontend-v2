import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

const MAX_PATHS = 5;

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    ""
  )
    .split(",")[0]
    ?.trim();
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function hasRevalidateToken(request: Request): boolean {
  const expectedToken = process.env.SEO_REVALIDATE_TOKEN;
  if (!expectedToken) return false;
  return request.headers.get("x-seo-revalidate-token") === expectedToken;
}

function normalizePaths(paths: unknown): string[] {
  if (!Array.isArray(paths)) return [];
  return paths
    .filter((path): path is string => typeof path === "string")
    .map((path) => path.trim())
    .filter(
      (path) =>
        path.startsWith("/news/") &&
        path.length <= 200 &&
        !path.includes("..") &&
        !path.includes("//") &&
        !path.includes("\\"),
    )
    .slice(0, MAX_PATHS);
}

export async function POST(request: Request) {
  if (!hasRevalidateToken(request) && !isSameOrigin(request)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  let payload: { paths?: unknown } = {};
  try {
    payload = (await request.json()) as { paths?: unknown };
  } catch {
    payload = {};
  }

  const pathsToRevalidate = Array.from(new Set(normalizePaths(payload.paths)));
  if (pathsToRevalidate.length === 0) {
    return NextResponse.json(
      { success: false, message: "No article paths to revalidate" },
      { status: 400 },
    );
  }

  for (const path of pathsToRevalidate) {
    revalidatePath(path, "page");
    const slug = path.replace(/^\/news\//, "");
    if (slug) {
      revalidatePath(`/api/news/${encodeURIComponent(slug)}/og-image`);
    }
  }

  return NextResponse.json({
    success: true,
    revalidated: pathsToRevalidate,
  });
}
