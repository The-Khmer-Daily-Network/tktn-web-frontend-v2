import type { Metadata } from "next";
import HomePageContent from "./home/HomePageContent";

export const metadata: Metadata = {
  title: {
    absolute: "The Khmer Today - Latest News, Articles & Videos",
  },
  description:
    "The Khmer Today is your trusted source for the latest news, articles, and videos. Stay informed with breaking news, in-depth coverage, and video reports from Cambodia and around the world.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.thekhmertoday.news"}/`,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "The Khmer Today",
    title: "The Khmer Today - Latest News, Articles & Videos",
    description:
      "The Khmer Today is your trusted source for the latest news, articles, and videos. Stay informed with breaking news, in-depth coverage, and video reports from Cambodia and around the world.",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.thekhmertoday.news"}/`,
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.thekhmertoday.news"}/assets/TKDN_Logo/TKTN_Logo_Square.png`,
        width: 1200,
        height: 1200,
        alt: "The Khmer Today Logo",
      },
    ],
  },
};

export default function PublicRootPage() {
  return <HomePageContent />;
}

