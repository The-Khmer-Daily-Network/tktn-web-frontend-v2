"use client";
import { memo } from "react";
import Image from "next/image";
import { useAdvertisement } from "@/contexts/AdvertisementContext";
import TKDNLogo from "@/assets/TKDN_Logo/TKDN_Logo_NoneBack.png";

function RightsideSponsor() {
  const { loading, getImageByPosition } = useAdvertisement();

  const baseStyle = {
    boxShadow: "0 0 0 rgba(0, 0, 0, 0.00)" as const,
  };

  if (loading) {
    return (
      <div className="w-full">
        {/* TopRight skeleton */}
        <div className="relative aspect-[3/5] max-w-[300px] max-h-[500px] w-full rounded-[10px] bg-gray-200 animate-pulse min-[402px]:hidden lg:block"></div>
        <div className="hidden min-[402px]:block lg:hidden relative aspect-[3/5] w-full rounded-[10px] bg-gray-200 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* TopRight Image - visible on mobile/desktop */}
      <div
        className="flex min-[402px]:hidden lg:flex relative overflow-hidden items-center justify-center rounded-[10px] aspect-[3/5] w-full max-w-[500px] max-h-[700px]"
        style={baseStyle}
      >
        {getImageByPosition("TopRight") ? (
          <Image
            src={getImageByPosition("TopRight")!.image_url}
            alt="Top Right Sponsor"
            fill
            className="object-cover rounded-[10px]"
          />
        ) : (
          <div className="w-full h-full rounded-[10px] flex items-center justify-center animate-pulse">
            <div className="relative w-[100px] h-[100px]">
              <Image
                src={TKDNLogo}
                alt="TKDN Logo"
                fill
                className="object-contain"
                priority
                unoptimized
              />
            </div>
          </div>
        )}
      </div>

      {/* TopRight Image on tablet */}
      <div
        className="hidden min-[402px]:flex lg:hidden relative overflow-hidden items-center justify-center rounded-[10px] aspect-[3/5] w-full max-w-none max-h-none"
        style={baseStyle}
      >
        {getImageByPosition("TopRight") ? (
          <Image
            src={getImageByPosition("TopRight")!.image_url}
            alt="Top Right Sponsor"
            fill
            className="object-cover rounded-[10px]"
          />
        ) : (
          <div className="w-full h-full rounded-[10px] flex items-center justify-center animate-pulse">
            <div className="relative w-[100px] h-[100px]">
              <Image
                src={TKDNLogo}
                alt="TKDN Logo"
                fill
                className="object-contain"
                priority
                unoptimized
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(RightsideSponsor);
