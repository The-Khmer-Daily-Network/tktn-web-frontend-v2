import type { NextConfig } from "next";

/** Used only when NEXT_PUBLIC_API_PROXY=1: browser hits /api-proxy/*, Next rewrites to this host's /api/*. */
const API_UPSTREAM_ORIGIN =
  process.env.API_UPSTREAM_ORIGIN ?? "https://api.thekhmertoday.news";

const isDev = process.env.NODE_ENV === "development";

const MEDIA_HOSTS = [
  "tkdn-development-v1.sgp1.digitaloceanspaces.com",
  "tkdn-development-v1.sgp1.cdn.digitaloceanspaces.com",
  "the-khmer-today.sgp1.digitaloceanspaces.com",
  "the-khmer-today.sgp1.cdn.digitaloceanspaces.com",
  "www.reuters.com",
];

function contentSecurityPolicy(): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ];
  const connectSrc = [
    "'self'",
    "https://api.thekhmertoday.news",
    "https://api.thekhmerdailynetwork.com",
    "https://www.google-analytics.com",
    "https://analytics.google.com",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://www.googletagmanager.com",
    ...(isDev
      ? [
          "http://127.0.0.1:8000",
          "http://localhost:8000",
          "ws://localhost:3000",
        ]
      : []),
  ];
  const mediaSrc = [
    "'self'",
    "blob:",
    ...MEDIA_HOSTS.map((host) => `https://${host}`),
  ];

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    `media-src ${mediaSrc.join(" ")}`,
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "0" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), microphone=(), camera=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/api-proxy/:path*",
        destination: `${API_UPSTREAM_ORIGIN.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
  images: {
    // A wildcard hostname turns /_next/image into an open proxy that anyone can
    // use to fetch and resize arbitrary URLs on this project's CPU.
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: MEDIA_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
