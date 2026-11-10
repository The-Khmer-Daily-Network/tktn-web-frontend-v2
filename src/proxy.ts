import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Runs only on API routes that can trigger cache rebuilds or image lookups.
 * Public pages get their security headers from `next.config.ts` without
 * invoking this function. On Vercel, this file is billed as Fluid Active CPU
 * on every matched request, including CDN cache hits.
 */
const RATE_LIMIT = {
  windowMs: 60 * 1000,
  maxRequests: 30,
};

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function getClientIp(request: NextRequest): string {
  // Vercel overwrites this header, so a client cannot spoof the bucket key.
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const ip = vercelForwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (rateLimitMap.size > 2000) {
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetTime) rateLimitMap.delete(key);
    }
  }

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT.windowMs });
    return true;
  }

  if (record.count >= RATE_LIMIT.maxRequests) return false;

  record.count += 1;
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
  const userAgent = request.headers.get("user-agent");
  if (isKnownSocialCrawler(userAgent)) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return new NextResponse(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      },
    );
  }

  const record = rateLimitMap.get(ip);
  const response = NextResponse.next();
  if (record) {
    response.headers.set("X-RateLimit-Limit", String(RATE_LIMIT.maxRequests));
    response.headers.set(
      "X-RateLimit-Remaining",
      String(Math.max(0, RATE_LIMIT.maxRequests - record.count)),
    );
    response.headers.set(
      "X-RateLimit-Reset",
      String(Math.ceil(record.resetTime / 1000)),
    );
  }
  return response;
}

export const config = {
  matcher: ["/api/admin/:path*", "/api/internal/:path*", "/api/news/:path*"],
};
