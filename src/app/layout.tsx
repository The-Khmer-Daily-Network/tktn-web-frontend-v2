import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdvertisementProvider } from "@/contexts/AdvertisementContext";
import GoogleAnalytics from "@/components/GoogleTagManager";
import OrganizationStructuredData from "@/components/OrganizationStructuredData";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fewer weights = less font memory (~400MB+ with no content is often dev + fonts)
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "The Khmer Today - Latest News, Articles & Videos",
    template: "%s | The Khmer Today",
  },
  icons: {
    icon: "/assets/TKDN_Logo/TKTN_Logo_Square.png",
    apple: "/assets/TKDN_Logo/TKTN_Logo_Square.png",
  },
  description:
    "The Khmer Today is your trusted source for the latest news, articles, and videos. Stay informed with breaking news, in-depth coverage, and video reports from Cambodia and around the world.",
  keywords: [
    "The Khmer Today",
    "Khmer news",
    "Cambodia news",
    "latest news",
    "breaking news",
    "news articles",
    "video news",
    "international news",
    "national news",
  ],
  authors: [{ name: "The Khmer Today" }],
  creator: "The Khmer Today",
  publisher: "The Khmer Today",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "The Khmer Today",
    title: "The Khmer Today - Latest News, Articles & Videos",
    description:
      "The Khmer Today is your trusted source for the latest news, articles, and videos. Stay informed with breaking news, in-depth coverage, and video reports from Cambodia and around the world.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.thekhmertoday.news",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.thekhmertoday.news"}/assets/TKDN_Logo/TKTN_Logo_Square.png`,
        width: 1200,
        height: 1200,
        alt: "The Khmer Today Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Khmer Today - Latest News, Articles & Videos",
    description:
      "The Khmer Today is your trusted source for the latest news, articles, and videos. Stay informed with breaking news, in-depth coverage, and video reports from Cambodia and around the world.",
    images: [`${process.env.NEXT_PUBLIC_SITE_URL || "https://www.thekhmertoday.news"}/assets/TKDN_Logo/TKTN_Logo_Square.png`],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased`}
        style={{ backgroundColor: "rgba(29, 34, 41, 0.0314)" }}
        suppressHydrationWarning
      >
        <GoogleAnalytics />
        <OrganizationStructuredData />
        <AuthProvider>
          <AdvertisementProvider>{children}</AdvertisementProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
