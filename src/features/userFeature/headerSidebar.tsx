"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu, X, ChevronDown, Search } from "lucide-react";
import TKTNLogo from "@/assets/TKDN_Logo/TKTN_Logo_Big.png";
import { getCategories } from "@/services/category";
import { categoryNameToSlug } from "@/utils/slug";
import type { Category } from "@/types/category";
import { getFontStyle, getFontClassName } from "@/utils/font";

export default function HeaderSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreHovered, setIsMoreHovered] = useState(false);
  const [isMoreClicked, setIsMoreClicked] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(
    null,
  );
  const [mobileExpandedCategoryId, setMobileExpandedCategoryId] = useState<
    number | null
  >(null);
  const [mobileTabsExpandedCategoryId, setMobileTabsExpandedCategoryId] =
    useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [hideMobileTopHeader, setHideMobileTopHeader] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingCategoriesRef = useRef(false);
  const lastScrollYRef = useRef(0);

  // Handle search button click - expand search input
  const handleSearchClick = () => {
    setIsSearchExpanded(true);
    // Focus input after state update
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  };

  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      // Keep query visible so user can refine it on the search page
      if (pathname !== "/search") {
        setIsSearchExpanded(false);
      }
    }
  };

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSearchExpanded &&
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchExpanded(false);
        setIsMobileMenuOpen(false);
        // Keep query when on the search page so user can refine it
        if (pathname !== "/search") {
          setSearchQuery("");
        }
      }
    };

    if (isSearchExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isSearchExpanded]);

  // Sync header search input with /search?q=... so the query stays visible/editable there
  useEffect(() => {
    if (pathname === "/search") {
      const q = searchParams.get("q") || "";
      setIsSearchExpanded(true);
      setSearchQuery(q);
    }
  }, [pathname, searchParams]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (!mounted) return;
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
  }, [isMobileMenuOpen, mounted]);

  // Helper function to check if a route is active
  const isActiveRoute = (href: string) => {
    if (!pathname) return false;

    // Normalize paths by removing leading/trailing slashes
    const currentPath = pathname.replace(/^\/|\/$/g, "");
    const routePath = href.replace(/^\/|\/$/g, "");

    // Exact match
    if (currentPath === routePath) return true;

    // Handle category routes - check if current path matches category slug
    // This handles both /news/[id] and /[slug] routes
    if (routePath && currentPath === routePath) return true;

    // Handle /news/[id] routes - extract the id/slug part
    if (currentPath.startsWith("category/")) {
      const categoryPart = currentPath.replace("category/", "");
      if (categoryPart === routePath) return true;
    }

    return false;
  };

  useEffect(() => {
    // Prevent multiple simultaneous fetches (React Strict Mode protection)
    if (isFetchingCategoriesRef.current) {
      return;
    }

    const fetchCategories = async () => {
      try {
        isFetchingCategoriesRef.current = true;
        const response = await getCategories();
        // Get first 6 main categories from API
        const mainCategories = response.categories.slice(0, 6);

        // Add "The Khmer Today" category manually
        const khmerDailyNetworkCategory: Category = {
          id: 999, // Use a high ID to avoid conflicts
          name: "The Khmer Today",
          parent_id: null,
          subcategories: [
            // { id: 1001, name: "About us", parent_id: 999 },
            { id: 1002, name: "Contact", parent_id: 999 },
            { id: 1003, name: "Facebook", parent_id: 999 },
            { id: 1004, name: "YouTube", parent_id: 999 },
            { id: 1005, name: "TikTok", parent_id: 999 },
            { id: 1006, name: "X", parent_id: 999 },
            { id: 1007, name: "Instagram", parent_id: 999 },
            { id: 1008, name: "Website", parent_id: 999 },
          ],
        };

        // Combine API categories with manual category
        setCategories([...mainCategories, khmerDailyNetworkCategory]);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        isFetchingCategoriesRef.current = false;
      }
    };
    fetchCategories();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Avoid hydration mismatch: render same as Suspense fallback until client has mounted.
  // (Date and categories would differ between server and client.)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Mobile-only: hide top header on scroll down, show on scroll up
  useEffect(() => {
    if (!mounted) return;

    const onScroll = () => {
      const y = window.scrollY || 0;

      if (y <= 10) {
        setHideMobileTopHeader(false);
        lastScrollYRef.current = y;
        return;
      }

      const prev = lastScrollYRef.current;
      const delta = y - prev;

      if (Math.abs(delta) < 8) return;

      if (delta > 0) {
        setHideMobileTopHeader(true);
      } else {
        setHideMobileTopHeader(false);
      }

      lastScrollYRef.current = y;
    };

    lastScrollYRef.current = window.scrollY || 0;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mounted]);

  const today = mounted ? new Date() : null;
  const dateStr = today
    ? today.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  if (!mounted) {
    return (
      <header
        className="h-16 bg-white border-b border-gray-200 animate-pulse w-full"
        aria-hidden="true"
      />
    );
  }

  type MobileTab = {
    href: string;
    label: string;
    categoryId?: number;
    subcategories?: Array<{ id: number; name: string }>;
  };

  const mainCategoryTabs: MobileTab[] = categories
    .filter(
      (c) => c.id !== 999 && c.name.toLowerCase().trim() !== "video",
    )
    .slice(0, 5)
    .map((c) => ({
      href: `/${categoryNameToSlug(c.name)}`,
      label: c.name,
      categoryId: c.id,
      subcategories: (c.subcategories || []).map((s) => ({
        id: s.id,
        name: s.name,
      })),
    }));

  const mobileTabs: MobileTab[] = [
    { href: "/latest", label: "Latest News" },
    { href: "/national", label: "National" },
    { href: "/international", label: "International" },
    { href: "/video", label: "Video" },
    ...mainCategoryTabs,
  ];

  return (
    <header className="w-full sticky top-0 z-50">
      <div
        className={[
          "w-full bg-white transition-[height] duration-200 ease-out",
          hideMobileTopHeader ? "md:h-[65px] h-0 overflow-hidden" : "h-[65px]",
        ].join(" ")}
      >
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          {/* Left Side - Logo and Search */}
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile Navigation Button (only mobile) */}

            {/* <button
              className="md:hidden p-2 text-[#1D2229] transition-colors"
              onClick={() => {
                setIsMobileMenuOpen(true);
                setIsSearchExpanded(false);
              }}
              aria-label="Open navigation"
              type="button"
            >
              <Menu size={24} />
            </button> */}

            {/* Logo */}
            <Link href="/home" className="shrink-0 cursor-pointer">
              <Image
                src={TKTNLogo}
                alt="The Khmer Today Logo"
                width={120}
                height={65}
                className="h-[60px] w-auto object-contain"
                priority
              />
            </Link>

            {/* Search Button/Input - Hidden on mobile */}
            <div ref={searchContainerRef} className="hidden md:block">
              {!isSearchExpanded ? (
                <button
                  onClick={handleSearchClick}
                  className="flex items-center justify-between h-[40px] rounded-[50px] transition-all duration-200 font-poppins cursor-pointer"
                  style={{
                    backgroundColor: "rgba(29, 34, 41, 0.0314)",
                    fontSize: "12px",
                    color: "#1D2229",
                    width: "300px",
                    paddingLeft: "16px",
                    paddingRight: "1px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "white";
                    e.currentTarget.style.boxShadow =
                      "0 0 5px rgba(29, 34, 41, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(29, 34, 41, 0.0314)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <span>Search News "The Khmer Today"</span>
                  <div
                    className="flex items-center justify-center rounded-full shrink-0"
                    style={{
                      backgroundColor: "#085c9c",
                      width: "60px",
                      height: "38px",
                    }}
                  >
                    <Search size={14} color="white" />
                  </div>
                </button>
              ) : (
                <form
                  onSubmit={handleSearchSubmit}
                  className="w-full"
                  style={{ width: "450px" }}
                >
                  <div
                    className="flex items-center justify-between h-[40px] rounded-[50px] transition-all duration-200 font-poppins"
                    style={{
                      backgroundColor: "white",
                      boxShadow: "0 0 5px rgba(29, 34, 41, 0.3)",
                      fontSize: "12px",
                      color: "#1D2229",
                      width: "300px",
                      paddingLeft: "16px",
                      paddingRight: "1px",
                    }}
                  >
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder='Search News "The Khmer Today"'
                      className="flex-1 bg-transparent border-none outline-none text-[#1D2229] placeholder-gray-400"
                      style={{ fontSize: "12px" }}
                      onBlur={(e) => {
                        // Don't close if clicking on the search button
                        if (
                          !e.relatedTarget ||
                          !(e.relatedTarget as HTMLElement).closest(
                            'button[type="submit"]',
                          )
                        ) {
                          // Small delay to allow form submission
                          setTimeout(() => {
                            if (!searchQuery.trim()) {
                              setIsSearchExpanded(false);
                            }
                          }, 200);
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className="flex items-center justify-center rounded-full shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                      style={{
                        backgroundColor: "#085c9c",
                        width: "60px",
                        height: "38px",
                      }}
                    >
                      <Search size={14} color="white" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right Side - Navigation (TKDN-style: uppercase, tracking) */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link
              href="/latest"
              className={`transition-colors text-sm font-semibold uppercase tracking-wider ${isActiveRoute("/latest")
                  ? "text-[#085C9C]"
                  : "text-[#1D2229] hover:text-[#085c9c]"
                }`}
            >
              Latest
            </Link>
            <Link
              href="/national"
              className={`transition-colors text-sm font-semibold uppercase tracking-wider ${isActiveRoute("/national")
                  ? "text-[#085C9C]"
                  : "text-[#1D2229] hover:text-[#085c9c]"
                }`}
            >
              National
            </Link>
            <Link
              href="/international"
              className={`transition-colors text-sm font-semibold uppercase tracking-wider ${isActiveRoute("/international")
                  ? "text-[#085C9C]"
                  : "text-[#1D2229] hover:text-[#085c9c]"
                }`}
            >
              International
            </Link>
            <Link
              href="/video"
              className={`transition-colors text-sm font-semibold uppercase tracking-wider ${isActiveRoute("/video")
                  ? "text-[#085C9C]"
                  : "text-[#1D2229] hover:text-[#085c9c]"
                }`}
              onClick={(e) => {
                e.preventDefault();
                router.push("/video");
              }}
            >
              Video
            </Link>
            {/* <Link
              href="/about-us"
              className={`transition-colors text-base ${isActiveRoute("/about-us")
                  ? "text-[#085C9C] font-medium"
                  : "text-[#1D2229] hover:text-[#085C9C] font-medium"
                }`}
            >
              About Us
            </Link> */}
            <div
              className="relative"
              onMouseEnter={() => {
                // Clear any pending timeout
                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current);
                  hoverTimeoutRef.current = null;
                }
                setIsMoreHovered(true);
              }}
              onMouseLeave={() => {
                // Set timeout to close dropdown after 0.2 seconds
                hoverTimeoutRef.current = setTimeout(() => {
                  setIsMoreHovered(false);
                  hoverTimeoutRef.current = null;
                }, 0);
              }}
            >
              <a
                href="#"
                className="flex items-center gap-1 text-[#1D2229] hover:text-[#085c9c] transition-colors font-semibold text-sm uppercase tracking-wider"
              >
                More
                <ChevronDown
                  size={16}
                  className={`transition-transform ${isMoreHovered ? "rotate-180" : ""}`}
                />
              </a>
            </div>
          </nav>

          {/* Mobile Search Button (replaces burger on mobile) */}
          <button
            className="md:hidden p-2 text-[#1D2229] transition-colors"
            onClick={() => {
              setIsSearchExpanded(true);
              setIsMobileMenuOpen(false);
              setTimeout(() => searchInputRef.current?.focus(), 0);
            }}
            aria-label="Search"
            type="button"
          >
            <Search size={22} />
          </button>

          {/* Tablet Menu Button (keep old behavior on tablet only) */}
          <button
            className="hidden md:block lg:hidden p-2 text-[#1D2229] transition-colors"
            onClick={() => {
              setIsMobileMenuOpen(!isMobileMenuOpen);
              setIsSearchExpanded(false);
            }}
            aria-label="Toggle menu"
            type="button"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile category tabs (CNA-like) */}
      <div className="md:hidden bg-white border-b border-x border-gray-200 h-[53px]">
        <div className="px-3 relative h-full">
          <div className="flex items-center gap-6 h-full overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {mobileTabs.map((tab) => {
              const hasSubs = !!tab.subcategories && tab.subcategories.length > 0;
              const anySubActive = hasSubs
                ? tab.subcategories!.some((s) =>
                    isActiveRoute(`/${categoryNameToSlug(s.name)}`),
                  )
                : false;
              const active = isActiveRoute(tab.href) || anySubActive;
              const isExpanded =
                !!tab.categoryId &&
                mobileTabsExpandedCategoryId === tab.categoryId;

              if (hasSubs && tab.categoryId) {
                return (
                  <div
                    key={tab.href}
                    className={`text-[14px] font-semibold flex items-center gap-1 ${
                      active ? "text-[#1D2229]" : "text-[#1D2229]"
                    }`}
                  >
                    <Link
                      href={tab.href}
                      className="block"
                      onClick={() => {
                        setMobileTabsExpandedCategoryId(null);
                      }}
                    >
                      <span className="relative">
                        {tab.label}
                        <span
                          className={`absolute left-0 -bottom-3 h-[3px] w-full ${
                            active ? "bg-[#D0021B]" : "bg-transparent"
                          }`}
                        />
                      </span>
                    </Link>
                    <button
                      type="button"
                      className="p-1"
                      aria-label={
                        isExpanded
                          ? "Collapse subcategories"
                          : "Expand subcategories"
                      }
                      onClick={() => {
                        setMobileTabsExpandedCategoryId(
                          isExpanded ? null : tab.categoryId!,
                        );
                      }}
                    >
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                );
              }

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`text-[14px] font-semibold ${
                    active ? "text-[#1D2229]" : "text-[#1D2229]"
                  }`}
                  onClick={(e) => {
                    setMobileTabsExpandedCategoryId(null);
                    if (tab.href === "/video") {
                      e.preventDefault();
                      router.push("/video");
                    }
                  }}
                >
                  <span className="relative">
                    {tab.label}
                    <span
                      className={`absolute left-0 -bottom-3 h-[3px] w-full ${
                        active ? "bg-[#D0021B]" : "bg-transparent"
                      }`}
                    />
                  </span>
                </Link>
              );
            })}
          </div>

          {mobileTabsExpandedCategoryId !== null && (
            <div className="absolute left-0 right-0 top-full bg-white border-t border-gray-200 shadow-sm z-10">
              <div className="px-3 py-2 flex flex-wrap gap-2">
                {mainCategoryTabs
                  .find((t) => t.categoryId === mobileTabsExpandedCategoryId)
                  ?.subcategories?.map((s) => {
                    const href = `/${categoryNameToSlug(s.name)}`;
                    const active = isActiveRoute(href);
                    return (
                      <Link
                        key={s.id}
                        href={href}
                        className={`px-3 py-2 rounded-full text-[13px] ${
                          active
                            ? "bg-[#085C9C]/10 text-[#085C9C] font-semibold"
                            : "bg-gray-50 text-gray-700"
                        }`}
                        onClick={() => setMobileTabsExpandedCategoryId(null)}
                      >
                        <span
                          className={getFontClassName(s.name)}
                          style={getFontStyle(s.name)}
                        >
                          {s.name}
                        </span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Width Categories Dropdown - Desktop (Hover) */}
      <div
        className="hidden lg:block relative w-full"
        onMouseEnter={() => {
          // Clear any pending timeout
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
          setIsMoreHovered(true);
        }}
        onMouseLeave={() => {
          // Set timeout to close dropdown after 1 second
          hoverTimeoutRef.current = setTimeout(() => {
            setIsMoreHovered(false);
            hoverTimeoutRef.current = null;
          }, 1000);
        }}
        style={{ marginTop: "-1px" }}
      >
        {isMoreHovered && (
          <>
            {/* Invisible bridge area to connect button and dropdown - extends upward to eliminate gap */}
            <div
              className="absolute top-0 right-0 pointer-events-auto"
              // Keep hover continuity near the "More" trigger, but don't block the search button area.
              style={{ height: "20px", marginTop: "-20px", width: "240px" }}
            ></div>
            <div className="relative w-full bg-white border-t border-gray-200 shadow-lg z-40">
              <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {categories.length > 0
                    ? categories.map((category) => {
                      const isVideoCategory = category.name.toLowerCase() === "video";
                      const categorySlug = isVideoCategory ? "/video" : `/${categoryNameToSlug(category.name)}`;
                      const isCategoryActive = isVideoCategory ? isActiveRoute("/video") : isActiveRoute(categorySlug);

                      return (
                        <div key={category.id} className="space-y-3">
                          <Link
                            href={categorySlug}
                            className={`block text-sm font-semibold uppercase tracking-wider transition-colors ${isCategoryActive
                                ? "text-[#085C9C]"
                                : "text-[#1D2229] hover:text-[#085c9c]"
                              }`}
                            onClick={(e) => {
                              if (isVideoCategory) {
                                e.preventDefault();
                                router.push("/video");
                              }
                            }}
                          >
                            <span 
                              className={getFontClassName(category.name)}
                              style={getFontStyle(category.name)}
                            >
                              {category.name}
                            </span>
                          </Link>
                          {category.subcategories &&
                            category.subcategories.length > 0 && (
                              <ul className="space-y-2">
                                {category.subcategories.map((subcategory) => {
                                  const isVideoSubcategory = subcategory.name.toLowerCase() === "video";
                                  const subcategorySlug = isVideoSubcategory ? "/video" : `/${categoryNameToSlug(subcategory.name)}`;
                                  const isSubcategoryActive = isVideoSubcategory ? isActiveRoute("/video") : isActiveRoute(subcategorySlug);

                                  return (
                                    <li key={subcategory.id}>
                                      <Link
                                        href={subcategorySlug}
                                        className={`block text-sm transition-colors ${isSubcategoryActive
                                            ? "text-[#085C9C] font-semibold"
                                            : "text-gray-600 hover:text-[#085c9c]"
                                          }`}
                                        onClick={(e) => {
                                          if (isVideoSubcategory) {
                                            e.preventDefault();
                                            router.push("/video");
                                          }
                                        }}
                                      >
                                        <span 
                                          className={getFontClassName(subcategory.name)}
                                          style={getFontStyle(subcategory.name)}
                                        >
                                          {subcategory.name}
                                        </span>
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                        </div>
                      );
                    })
                    : // Placeholder categories while loading
                    Array.from({ length: 7 }).map((_, index) => (
                      <div key={index} className="space-y-3">
                        <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                        <ul className="space-y-2">
                          {Array.from({ length: 3 }).map((_, subIndex) => (
                            <li key={subIndex}>
                              <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile Search (overlay) */}
      {isSearchExpanded && (
        <div className="md:hidden border-t border-gray-200 bg-white shadow-sm">
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-7xl mx-auto px-4 py-3"
          >
            <div className="flex items-center gap-2 rounded-[14px] border border-gray-200 bg-gray-50 px-3 py-2">
              <Search size={18} className="text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search News "The Khmer Today"'
                className="flex-1 bg-transparent outline-none text-[#1D2229] placeholder-gray-400 text-[16px] md:text-sm"
              />
              <button
                type="button"
                className="p-1 text-gray-600"
                aria-label="Close search"
                onClick={() => {
                  setIsSearchExpanded(false);
                  if (pathname !== "/search") setSearchQuery("");
                }}
              >
                <X size={18} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mobile Navigation Drawer (CNA-like) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-60">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close navigation"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 w-[86vw] max-w-[380px] bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
              <span className="text-[15px] font-semibold tracking-wide text-[#1D2229]">
                Menu
              </span>
              <button
                type="button"
                className="p-2 text-[#1D2229]"
                aria-label="Close menu"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Primary links */}
              <nav className="px-2 py-2">
                {[
                  { href: "/latest", label: "Latest" },
                  { href: "/national", label: "National" },
                  { href: "/international", label: "International" },
                  { href: "/video", label: "Video", isVideo: true },
                ].map((item) => {
                  const active = isActiveRoute(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-3 rounded-lg text-[16px] font-semibold ${
                        active
                          ? "text-[#085C9C] bg-[#085C9C]/5"
                          : "text-[#1D2229] hover:bg-gray-50"
                      }`}
                      onClick={(e) => {
                        if ((item as { isVideo?: boolean }).isVideo) {
                          e.preventDefault();
                          router.push("/video");
                        }
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <span className="uppercase tracking-wide">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-gray-200 my-2" />

              {/* Categories with dropdowns */}
              <div className="px-2 pb-4">
                <div className="px-3 pt-2 pb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Categories
                </div>

                <div className="space-y-1">
                  {categories.map((category) => {
                    const isVideoCategory =
                      category.name.toLowerCase() === "video";
                    const categorySlug = isVideoCategory
                      ? "/video"
                      : `/${categoryNameToSlug(category.name)}`;
                    const hasSubs =
                      !!category.subcategories &&
                      category.subcategories.length > 0;
                    const isExpanded = mobileExpandedCategoryId === category.id;

                    return (
                      <div key={category.id} className="rounded-lg">
                        <div className="flex items-center">
                          <Link
                            href={categorySlug}
                            className={`flex-1 px-3 py-3 text-[15px] font-semibold ${
                              isActiveRoute(categorySlug)
                                ? "text-[#085C9C] bg-[#085C9C]/5 rounded-lg"
                                : "text-[#1D2229] hover:bg-gray-50 rounded-lg"
                            }`}
                            onClick={(e) => {
                              if (isVideoCategory) {
                                e.preventDefault();
                                router.push("/video");
                              }
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <span
                              className={getFontClassName(category.name)}
                              style={getFontStyle(category.name)}
                            >
                              {category.name}
                            </span>
                          </Link>

                          {hasSubs && (
                            <button
                              type="button"
                              className="mr-2 p-2 text-gray-700"
                              aria-label={
                                isExpanded
                                  ? "Collapse subcategories"
                                  : "Expand subcategories"
                              }
                              onClick={() =>
                                setMobileExpandedCategoryId(
                                  isExpanded ? null : category.id,
                                )
                              }
                            >
                              <ChevronDown
                                size={18}
                                className={`transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          )}
                        </div>

                        {hasSubs && isExpanded && (
                          <ul className="ml-3 mr-2 mb-2 border-l border-gray-200 pl-3 space-y-1">
                            {category.subcategories!.map((subcategory) => {
                              const isVideoSubcategory =
                                subcategory.name.toLowerCase() === "video";
                              const subcategorySlug = isVideoSubcategory
                                ? "/video"
                                : `/${categoryNameToSlug(subcategory.name)}`;

                              return (
                                <li key={subcategory.id}>
                                  <Link
                                    href={subcategorySlug}
                                    className={`block px-2 py-2 rounded-md text-[14px] ${
                                      isActiveRoute(subcategorySlug)
                                        ? "text-[#085C9C] bg-[#085C9C]/5 font-semibold"
                                        : "text-gray-700 hover:bg-gray-50"
                                    }`}
                                    onClick={(e) => {
                                      if (isVideoSubcategory) {
                                        e.preventDefault();
                                        router.push("/video");
                                      }
                                      setIsMobileMenuOpen(false);
                                    }}
                                  >
                                    <span
                                      className={getFontClassName(
                                        subcategory.name,
                                      )}
                                      style={getFontStyle(subcategory.name)}
                                    >
                                      {subcategory.name}
                                    </span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tablet Menu (legacy style, unchanged) */}
      {isMobileMenuOpen && (
        <div className="hidden md:block lg:hidden bg-gray-50 border-t border-gray-200 py-4 shadow-inner">
          <div className="max-w-7xl mx-auto px-4 space-y-4">
            <nav className="flex flex-col space-y-3">
              <Link
                href="/latest"
                className={`transition-colors text-sm font-semibold uppercase tracking-wider py-2 ${
                  isActiveRoute("/latest")
                    ? "text-[#085C9C]"
                    : "text-[#1D2229] hover:text-[#085c9c]"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Latest
              </Link>
              <Link
                href="/national"
                className={`transition-colors text-sm font-semibold uppercase tracking-wider py-2 ${
                  isActiveRoute("/national")
                    ? "text-[#085C9C]"
                    : "text-[#1D2229] hover:text-[#085c9c]"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                National
              </Link>
              <Link
                href="/international"
                className={`transition-colors text-sm font-semibold uppercase tracking-wider py-2 ${
                  isActiveRoute("/international")
                    ? "text-[#085C9C]"
                    : "text-[#1D2229] hover:text-[#085c9c]"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                International
              </Link>
              <Link
                href="/video"
                className={`transition-colors text-sm font-semibold uppercase tracking-wider py-2 ${
                  isActiveRoute("/video")
                    ? "text-[#085C9C]"
                    : "text-[#1D2229] hover:text-[#085c9c]"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  router.push("/video");
                  setIsMobileMenuOpen(false);
                }}
              >
                Video
              </Link>

              <div className="border-t border-gray-200 pt-3">
                <button
                  onClick={() => setIsMoreClicked(!isMoreClicked)}
                  className="text-[#1D2229] hover:text-[#085c9c] transition-colors font-semibold text-sm uppercase tracking-wider py-2 flex items-center gap-1 w-full text-left"
                  type="button"
                >
                  More
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      isMoreClicked ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isMoreClicked && (
                  <div className="pl-4 mt-2 space-y-2">
                    {categories.map((category) => {
                      const isVideoCategory =
                        category.name.toLowerCase() === "video";
                      const categorySlug = isVideoCategory
                        ? "/video"
                        : `/${categoryNameToSlug(category.name)}`;
                      const isCategoryActive = isVideoCategory
                        ? isActiveRoute("/video")
                        : isActiveRoute(categorySlug);

                      return (
                        <div key={category.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={categorySlug}
                              className={`flex-1 text-base transition-colors ${
                                isCategoryActive
                                  ? "text-[#085C9C] font-semibold"
                                  : "text-[#1D2229] hover:text-[#085C9C] font-semibold"
                              }`}
                              onClick={(e) => {
                                if (isVideoCategory) {
                                  e.preventDefault();
                                  router.push("/video");
                                }
                                setIsMobileMenuOpen(false);
                                setIsMoreClicked(false);
                              }}
                            >
                              {category.name}
                            </Link>
                            {category.subcategories &&
                              category.subcategories.length > 0 && (
                                <button
                                  onClick={() => {
                                    setExpandedCategoryId(
                                      expandedCategoryId === category.id
                                        ? null
                                        : category.id,
                                    );
                                  }}
                                  className="p-1"
                                  type="button"
                                >
                                  <ChevronDown
                                    size={12}
                                    className={`transition-transform ${
                                      expandedCategoryId === category.id
                                        ? "rotate-180"
                                        : ""
                                    }`}
                                  />
                                </button>
                              )}
                          </div>
                          {category.subcategories &&
                            category.subcategories.length > 0 &&
                            expandedCategoryId === category.id && (
                              <ul className="pl-4 space-y-1">
                                {category.subcategories.map((subcategory) => {
                                  const isVideoSubcategory =
                                    subcategory.name.toLowerCase() === "video";
                                  const subcategorySlug = isVideoSubcategory
                                    ? "/video"
                                    : `/${categoryNameToSlug(subcategory.name)}`;
                                  const isSubcategoryActive = isVideoSubcategory
                                    ? isActiveRoute("/video")
                                    : isActiveRoute(subcategorySlug);

                                  return (
                                    <li key={subcategory.id}>
                                      <Link
                                        href={subcategorySlug}
                                        className={`block text-sm transition-colors ${
                                          isSubcategoryActive
                                            ? "text-[#085C9C] font-semibold"
                                            : "text-gray-600 hover:text-[#085c9c]"
                                        }`}
                                        onClick={(e) => {
                                          if (isVideoSubcategory) {
                                            e.preventDefault();
                                            router.push("/video");
                                          }
                                          setIsMobileMenuOpen(false);
                                          setIsMoreClicked(false);
                                        }}
                                      >
                                        {subcategory.name}
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
