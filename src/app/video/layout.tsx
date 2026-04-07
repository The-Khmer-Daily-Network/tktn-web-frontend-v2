import type { Metadata } from "next";
import { Suspense } from "react";
import HeaderSidebar from "@/features/userFeature/headerSidebar";
import RightsideSponsor from "@/features/sponsor/rightsideSponsor";
import FooterFeature from "@/features/userFeature/footerFeature";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.thekhmertoday.news";
const videoUrl = `${baseUrl}/video`;

export const metadata: Metadata = {
  title: "News Videos - The Khmer Today",
  description:
    "Watch the latest news videos and video reports from The Khmer Today. Stay informed with video coverage of breaking news and stories from Cambodia and around the world.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "The Khmer Today",
    title: "News Videos - The Khmer Today",
    description:
      "Watch the latest news videos and video reports from The Khmer Today. Stay informed with video coverage of breaking news and stories.",
    url: videoUrl,
    images: [
      {
        url: `${baseUrl}/assets/TKDN_Logo/TKTN_Logo_Square.png`,
        width: 1200,
        height: 1200,
        alt: "The Khmer Today - News Videos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "News Videos - The Khmer Today",
    description:
      "Watch the latest news videos and video reports from The Khmer Today.",
    images: [`${baseUrl}/assets/TKDN_Logo/TKTN_Logo_Square.png`],
  },
  alternates: {
    canonical: videoUrl,
  },
};

function HeaderFallback() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 animate-pulse" aria-hidden="true" />
  );
}

export default function VideoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Suspense fallback={<HeaderFallback />}>
        <HeaderSidebar />
      </Suspense>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full">{children}</div>
        </div>
      </div>
      <FooterFeature />
    </div>
  );
}