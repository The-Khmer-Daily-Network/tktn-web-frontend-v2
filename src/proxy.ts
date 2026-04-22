import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting store (in production, use Redis or a proper cache)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute per IP
};

function getRateLimitKey(request: NextRequest): string {
  // Prefer real client IP headers from proxies/load balancers.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Never fall back to hostname, because that would bucket everyone together.
  return "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  // Lazy cleanup on request path (avoid background timers in runtime).
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    // Create new record or reset expired one
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT.maxRequests) {
    return false; // Rate limit exceeded
  }

  // Increment count
  record.count++;
  return true;
}

function isKnownSocialCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return (
    ua.includes("facebookexternalhit") ||
    ua.includes("facebot") ||
    ua.includes("twitterbot") ||
    ua.includes("telegrambot") ||
    ua.includes("linkedinbot") ||
    ua.includes("slackbot") ||
    ua.includes("discordbot")
  );
}

export function proxy(request: NextRequest) {
  // Security headers
  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );

  // Only apply rate limiting to API routes and dynamic pages
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const isApiRoute = pathname.startsWith("/api");
  const isRscRequest = request.nextUrl.searchParams.has("_rsc");
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/);
  const userAgent = request.headers.get("user-agent");

  // Skip rate limiting for static assets
  // Also skip known social crawlers to avoid breaking link preview scrapes.
  if (isStaticAsset || isKnownSocialCrawler(userAgent)) {
    return response;
  }

  // Apply rate limiting to API routes and non-GET dynamic actions only.
  // This avoids throttling regular page navigation and RSC fetches.
  const shouldRateLimit =
    isApiRoute || (method !== "GET" && method !== "HEAD" && !isRscRequest);

  if (shouldRateLimit) {
    const ip = getRateLimitKey(request);
    const allowed = checkRateLimit(ip);

    if (!allowed) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests. Please try again later.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        },
      );
    }

    // Add rate limit headers
    const record = rateLimitMap.get(ip);
    if (record) {
      response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT.maxRequests));
      response.headers.set(
        "X-RateLimit-Remaining",
        String(RATE_LIMIT.maxRequests - record.count),
      );
      response.headers.set(
        "X-RateLimit-Reset",
        String(Math.ceil(record.resetTime / 1000)),
      );
    }
  }

  return response;
}

// Configure which routes the proxy runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
