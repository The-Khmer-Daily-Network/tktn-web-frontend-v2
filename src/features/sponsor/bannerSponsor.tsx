"use client";
import { memo } from "react";
import Image from "next/image";
import { useAdvertisement } from "@/contexts/AdvertisementContext";

function BannerSponsor() {
  const { loading, getImageByPosition } = useAdvertisement();

  const bannerImage = getImageByPosition("Banner");

  if (loading || !bannerImage) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="relative w-full h-[200px] rounded-[10px] overflow-hidden">
        <Image
          src={bannerImage.image_url}
          alt="Banner Sponsor"
          fill
          className="object-cover"
          sizes="100vw"
          quality={100}
          unoptimized
        />
      </div>
    </div>
  );
}

export default memo(BannerSponsor);
