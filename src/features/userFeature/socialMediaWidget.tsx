"use client";

import { useState, useEffect } from "react";
import { getSocialMedia } from "@/services/socialMedia";
import type { SocialMedia } from "@/types/socialMedia";
import {
  Facebook,
  Youtube,
  Linkedin,
  Globe,
  Instagram,
} from "lucide-react";

// Custom TikTok Icon Component
const TikTokIcon = ({ className, strokeWidth = 1.5 }: { className?: string; strokeWidth?: number }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

// Map social media names to icons
const getSocialIcon = (name: string) => {
  const normalizedName = name.toLowerCase().trim();

  if (normalizedName.includes("facebook") || normalizedName === "fb")
    return Facebook;
  if (normalizedName.includes("youtube") || normalizedName === "yt")
    return Youtube;
  if (normalizedName.includes("tiktok") || normalizedName === "tt")
    return TikTokIcon;
  if (normalizedName.includes("linkedin") || normalizedName === "li")
    return Linkedin;
  if (normalizedName.includes("instagram") || normalizedName === "ig")
    return Instagram;
  if (
    normalizedName.includes("website") ||
    normalizedName.includes("web") ||
    normalizedName === "site"
  )
    return Globe;

  // Default to Globe icon for unknown platforms
  return Globe;
};

// Format platform name for display
const formatPlatformName = (name: string): string => {
  const normalizedName = name.toLowerCase().trim();
  
  if (normalizedName.includes("tiktok")) return "Tik Tok";
  if (normalizedName.includes("instagram")) return "Instgram"; // Matching the image typo
  
  // Capitalize first letter of each word
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export default function SocialMediaWidget() {
  const [socialMedia, setSocialMedia] = useState<SocialMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSocialMedia = async () => {
      try {
        const response = await getSocialMedia();
        console.log("Social Media API Response:", response);
        
        // Default platforms with fallback links
        const defaultPlatforms = [
          { id: 1, name: "Facebook", link: "https://www.facebook.com/TheKhmersDailyNetwork" },
          { id: 2, name: "YouTube", link: "https://www.youtube.com/@TheKhmerDailyNetworks" },
          { id: 3, name: "TikTok", link: "https://www.tiktok.com" },
          { id: 4, name: "LinkedIn", link: "https://www.linkedin.com" },
          { id: 5, name: "Website", link: "https://www.thekhmertoday.news" },
          { id: 6, name: "Instagram", link: "https://www.instagram.com" },
        ];

        // If API returns data, merge with defaults (prioritize API data)
        if (response.data && response.data.length > 0) {
          const orderedPlatforms = ["Facebook", "YouTube", "TikTok", "LinkedIn", "Website", "Instagram"];
          
          // Create a map of API data by normalized name
          const apiDataMap = new Map();
          response.data.forEach((item) => {
            const normalizedName = item.name.toLowerCase().trim();
            orderedPlatforms.forEach((platform) => {
              if (normalizedName.includes(platform.toLowerCase()) || platform.toLowerCase().includes(normalizedName)) {
                apiDataMap.set(platform.toLowerCase(), item);
              }
            });
          });

          // Merge: use API data if available, otherwise use default
          const mergedData = orderedPlatforms.map((platform, index) => {
            const apiItem = apiDataMap.get(platform.toLowerCase());
            if (apiItem) {
              // Ensure unique ID by using index + 1 (since we're mapping in order)
              return { ...apiItem, id: index + 1 };
            }
            // Find matching default
            const defaultItem = defaultPlatforms.find(
              (d) => d.name.toLowerCase() === platform.toLowerCase()
            );
            return defaultItem || { id: index + 1, name: platform, link: "#" };
          });

          console.log("Merged Social Media:", mergedData);
          setSocialMedia(mergedData);
        } else {
          // If API returns empty, use defaults
          console.log("No data from API, using defaults");
          setSocialMedia(defaultPlatforms);
        }
      } catch (error) {
        console.error("Error fetching social media:", error);
        // Fallback to default social media if API fails
        setSocialMedia([
          { id: 1, name: "Facebook", link: "https://www.facebook.com/TheKhmersDailyNetwork" },
          { id: 2, name: "YouTube", link: "https://www.youtube.com/@TheKhmerDailyNetworks" },
          { id: 3, name: "TikTok", link: "https://www.tiktok.com" },
          { id: 4, name: "LinkedIn", link: "https://www.linkedin.com" },
          { id: 5, name: "Website", link: "https://www.thekhmertoday.news" },
          { id: 6, name: "Instagram", link: "https://www.instagram.com" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSocialMedia();
  }, []);

  if (loading) {
    return (
      <div className="w-full rounded-[10px] overflow-hidden bg-gray-200 animate-pulse">
        <div className="h-16 bg-gray-300"></div>
        <div className="h-48 bg-gray-100"></div>
      </div>
    );
  }

  // Default follower count (can be made dynamic later)
  const followerCount = "1.7M";

  return (
    <div className="w-full h-full rounded-[10px] overflow-hidden flex flex-col" style={{ boxShadow: "0 0 0 rgba(0, 0, 0, 0.00)" }}>
      {/* Header - Dark Blue */}
      <div className="bg-[#273C8F] px-3 py-2.5 flex-shrink-0">
        <h3 className="text-white font-bold text-base max-[1023px]:text-base min-[1024px]:max-[1091px]:text-xs min-[1092px]:text-sm">Follow Us</h3>
        <p className="text-white text-xs max-[1023px]:text-xs min-[1024px]:max-[1091px]:text-[9px] min-[1092px]:text-[10px] font-normal">The Khmer Today</p>
      </div>

      {/* Body - Light Grey */}
      <div className="bg-gray-100 px-3 py-2 space-y-1 flex-1 flex flex-col justify-center">
        {socialMedia.length > 0 ? (
          socialMedia.map((social, index) => {
            const IconComponent = getSocialIcon(social.name);
            const displayName = formatPlatformName(social.name);

            return (
              <a
                key={`${social.id || index}-${social.name}-${index}`}
                href={social.link || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center w-full hover:opacity-80 transition-opacity cursor-pointer py-0.5"
              >
                {/* Icon - Left */}
                <div className="flex-shrink-0 w-5 h-5 max-[1023px]:w-6 max-[1023px]:h-6 min-[1024px]:max-[1091px]:w-4 min-[1024px]:max-[1091px]:h-4 min-[1092px]:w-5 min-[1092px]:h-5 flex items-center justify-center">
                  {social.name.toLowerCase().includes("tiktok") ? (
                    <TikTokIcon className="w-5 h-5 max-[1023px]:w-5 max-[1023px]:h-5 min-[1024px]:max-[1091px]:w-3.5 min-[1024px]:max-[1091px]:h-3.5 min-[1092px]:w-4 min-[1092px]:h-4 text-gray-600" strokeWidth={1.5} />
                  ) : (
                    <IconComponent className="w-5 h-5 max-[1023px]:w-5 max-[1023px]:h-5 min-[1024px]:max-[1091px]:w-3.5 min-[1024px]:max-[1091px]:h-3.5 min-[1092px]:w-4 min-[1092px]:h-4 text-gray-600" strokeWidth={1.5} />
                  )}
                </div>

                {/* Platform Name - Middle */}
                <div className="flex-1 px-2">
                  <span className="text-sm max-[1023px]:text-sm min-[1024px]:max-[1091px]:text-[10px] min-[1092px]:text-xs text-[#1D2229] font-normal">
                    {displayName}
                  </span>
                </div>

                {/* Follower Count - Right */}
                <div className="flex-shrink-0">
                  <span className="text-sm max-[1023px]:text-sm min-[1024px]:max-[1091px]:text-[10px] min-[1092px]:text-xs text-gray-600">{followerCount}</span>
                </div>
              </a>
            );
          })
        ) : (
          <p className="text-sm text-gray-600 text-center py-4">
            No social media links available
          </p>
        )}
      </div>
    </div>
  );
}
