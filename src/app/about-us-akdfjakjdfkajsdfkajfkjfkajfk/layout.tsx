import { Suspense } from "react";
import HeaderSidebar from "@/features/userFeature/headerSidebar";
import FooterFeature from "@/features/userFeature/footerFeature";

function HeaderFallback() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 animate-pulse" aria-hidden="true" />
  );
}

export default function AboutUsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Suspense fallback={<HeaderFallback />}>
        <HeaderSidebar />
      </Suspense>
      <div className="max-w-8xl mx-auto px-4 mt-[-100px]">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full">{children}</div>
        </div>
      </div>
      <FooterFeature />
    </div>
  );
}
