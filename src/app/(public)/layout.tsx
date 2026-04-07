import { Suspense } from "react";
import HeaderSidebar from "@/features/userFeature/headerSidebar";
import RightsideSponsor from "@/features/sponsor/rightsideSponsor";
import FooterFeature from "@/features/userFeature/footerFeature";

function HeaderFallback() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 animate-pulse" aria-hidden="true" />
  );
}

export default function PublicLayout({
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
          {/* Main Content - 70% on desktop/tablet, full width on mobile */}
          <div className="w-full">{children}</div>
        </div>
      </div>
      <FooterFeature />
    </div>
  );
}
