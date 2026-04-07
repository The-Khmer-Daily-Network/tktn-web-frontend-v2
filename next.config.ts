import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tkdn-development-v1.sgp1.digitaloceanspaces.com",
      },
      {
        protocol: "https",
        hostname: "tkdn-development-v1.sgp1.cdn.digitaloceanspaces.com",
      },
      {
        protocol: "https",
        hostname: "www.reuters.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.thekhmerdailynetwork.com http://api.thekhmertoday.news https://api.thekhmertoday.news http://127.0.0.1:8000 http://localhost:8000 https://www.google-analytics.com https://www.googletagmanager.com; media-src 'self' https://tkdn-development-v1.sgp1.digitaloceanspaces.com https://the-khmer-today.sgp1.digitaloceanspaces.com; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com;",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
