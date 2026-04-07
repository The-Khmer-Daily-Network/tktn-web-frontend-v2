"use client";

import { useState, useEffect } from "react";
import NewsDashboard from "@/features/userFeature/newsDashboard";
import NationalNews from "@/features/userFeature/nationalNews";
import InternationalNews from "@/features/userFeature/internationalNews";
import VideoNews from "@/features/userFeature/videoNews";
import BannerSponsor from "@/features/sponsor/bannerSponsor";
import ScrollRevealSection from "@/components/ScrollRevealSection";
import { getHomePageData, type HomePageData } from "./api";

export default function HomePageContent() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HomePageData | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHomePageData()
      .then((res) => {
        if (cancelled || !res.success || !res.data) return;
        const d = res.data;
        // Need at least 8 items for mobile layout (hero + list + 2x2 grid)
        setData({
          dashboard: (d.dashboard || []).filter((a) => a.cover != null).slice(0, 10),
          national: (d.national || []).filter((a) => a.cover != null),
          international: (d.international || []).filter((a) => a.cover != null),
          videos: (d.videos || []).filter((v) => v.middle_video_url != null),
        });
      })
      .catch((err) => {
        if (!cancelled) console.error("Error fetching home data:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="space-y-12">
        <ScrollRevealSection delayMs={0} direction="up" distance={10}>
          <NewsDashboard initialData={data?.dashboard ?? null} loading={loading} />
        </ScrollRevealSection>
        <ScrollRevealSection delayMs={60} direction="up" distance={10}>
          <NationalNews initialData={data?.national ?? null} loading={loading} />
        </ScrollRevealSection>
        <BannerSponsor />
        <ScrollRevealSection delayMs={90} direction="up" distance={10}>
          <InternationalNews initialData={data?.international ?? null} loading={loading} />
        </ScrollRevealSection>
        <BannerSponsor />
        <ScrollRevealSection delayMs={120} direction="up" distance={10}>
          <VideoNews initialData={data?.videos ?? null} loading={loading} />
        </ScrollRevealSection>
        <BannerSponsor />
      </div>
    </>
  );
}
