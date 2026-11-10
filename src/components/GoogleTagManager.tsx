import Script from "next/script";

const GA_ID_PATTERN = /^(G-[A-Z0-9]+|GTM-[A-Z0-9]+|AW-[A-Z0-9]+|UA-\d+-\d+)$/i;

export default function GoogleAnalytics() {
  const rawId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
  const GA_MEASUREMENT_ID = GA_ID_PATTERN.test(rawId) ? rawId : "";

  // If unset or not a measurement id, don't inject GA scripts.
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      {/* GA4 - Load gtag.js library */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />

      {/* GA4 - Initialize and configure */}
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `,
        }}
      />
    </>
  );
}
