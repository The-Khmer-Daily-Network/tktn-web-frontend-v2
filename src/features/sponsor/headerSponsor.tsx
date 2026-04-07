"use client";
import Image from "next/image";
import { useAdvertisement } from "@/contexts/AdvertisementContext";

export default function HeaderSponsor() {
  const { loading, getImageByPosition } = useAdvertisement();

  const headerImage = getImageByPosition("Header");

  // Show skeleton while loading
  if (loading) {
    return (
      <div className="sticky top-0 z-50 w-full overflow-hidden h-[30px]">
        <div
          className="flex animate-slide-right-responsive"
          style={{ width: "200%" }}
        >
          <div className="relative w-1/2 shrink-0 h-[30px] bg-gray-200 animate-pulse"></div>
          <div className="relative w-1/2 shrink-0 h-[30px] bg-gray-200 animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Return null if no header image after loading
  if (!headerImage) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 w-full overflow-hidden h-[30px]">
      <div
        className="flex animate-slide-right-responsive"
        style={{ width: "200%" }}
      >
        <div className="relative w-1/2 shrink-0 h-[30px]">
          <Image
            src={headerImage.image_url}
            alt="Header Sponsor"
            fill
            className="object-cover"
            sizes="100vw"
            priority
            quality={100}
            unoptimized
          />
        </div>
        <div className="relative w-1/2 shrink-0 h-[30px]">
          <Image
            src={headerImage.image_url}
            alt="Header Sponsor"
            fill
            className="object-cover"
            sizes="100vw"
            priority
            quality={100}
            unoptimized
          />
        </div>
      </div>
    </div>
  );
}
