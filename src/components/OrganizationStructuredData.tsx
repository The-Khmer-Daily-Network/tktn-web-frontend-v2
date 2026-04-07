"use client";

import { useEffect } from "react";

export default function OrganizationStructuredData() {
  useEffect(() => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://www.thekhmertoday.news";

    // Remove existing organization structured data if any
    const existingScript = document.querySelector(
      'script[type="application/ld+json"][data-organization]'
    );
    if (existingScript) {
      existingScript.remove();
    }

    // Organization structured data for better brand search
    const organizationData = {
      "@context": "https://schema.org",
      "@type": "NewsMediaOrganization",
      "name": "The Khmer Today",
      "url": baseUrl,
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/assets/TKDN_Logo/TKTN_Logo_Square.png`,
        "width": 1200,
        "height": 1200,
      },
      "sameAs": [
        // Add your social media URLs here if you have them
      ],
      "description": "The Khmer Today is your trusted source for the latest news, articles, and videos. Stay informed with breaking news, in-depth coverage, and video reports from Cambodia and around the world.",
    };

    // Website structured data
    const websiteData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "The Khmer Today",
      "url": baseUrl,
      "description": "The Khmer Today is your trusted source for the latest news, articles, and videos.",
      "publisher": {
        "@type": "NewsMediaOrganization",
        "name": "The Khmer Today",
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${baseUrl}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    };

    // Add organization structured data
    const orgScript = document.createElement("script");
    orgScript.type = "application/ld+json";
    orgScript.setAttribute("data-organization", "true");
    orgScript.text = JSON.stringify(organizationData);
    document.head.appendChild(orgScript);

    // Add website structured data
    const websiteScript = document.createElement("script");
    websiteScript.type = "application/ld+json";
    websiteScript.setAttribute("data-website", "true");
    websiteScript.text = JSON.stringify(websiteData);
    document.head.appendChild(websiteScript);

    // Cleanup on unmount
    return () => {
      const orgScriptToRemove = document.querySelector(
        'script[type="application/ld+json"][data-organization]'
      );
      if (orgScriptToRemove) {
        orgScriptToRemove.remove();
      }
      const websiteScriptToRemove = document.querySelector(
        'script[type="application/ld+json"][data-website]'
      );
      if (websiteScriptToRemove) {
        websiteScriptToRemove.remove();
      }
    };
  }, []);

  return null;
}
