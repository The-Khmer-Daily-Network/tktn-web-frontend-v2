"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/assets/TKDN_Logo/TKTN_Logo_Big.png";
import { useAuth } from "@/contexts/AuthContext";
import { changeMyPassword } from "@/services/userService";

export default function SidebareAdmin() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserSME, logout } = useAuth();
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Auto-open dropdowns that contain the active route
  useEffect(() => {
    // Check if current route is under Media Library
    if (
      pathname?.includes("/covers") ||
      pathname?.includes("/content-images") ||
      pathname?.includes("/content-videos")
    ) {
      setMediaLibraryOpen(true);
    }
    // Check if current route is under Analytics
    if (
      pathname?.includes("/dashboard") ||
      pathname?.includes("/web") ||
      pathname?.includes("/socialMedia")
    ) {
      setDashboardOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Helper function to check if a route is active
  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  // Helper function to get link classes
  const getLinkClasses = (
    path: string,
    isSubItem: boolean = false,
    disabled: boolean = false,
  ) => {
    const active = isActive(path);
    const baseClasses = isSubItem
      ? "block px-4 py-2 text-sm rounded-md transition-colors"
      : "block px-4 py-2 rounded-md transition-colors";

    if (disabled) {
      return `${baseClasses} text-gray-400 cursor-not-allowed opacity-60`;
    }

    if (active) {
      return `${baseClasses} bg-[#273C8F] text-white`;
    }
    return `${baseClasses} text-[#273C8F] hover:bg-gray-100`;
  };

  const resetProfileModal = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setProfileError(null);
    setProfileSuccess(null);
    setProfileLoading(false);
  };

  const handleChangePassword = async () => {
    if (!user?.id) {
      setProfileError("Unable to detect current user.");
      return;
    }
    if (!oldPassword || !newPassword || !confirmPassword) {
      setProfileError("Please fill all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setProfileError("New password and confirm password do not match.");
      return;
    }

    try {
      setProfileLoading(true);
      setProfileError(null);
      setProfileSuccess(null);
      const res = await changeMyPassword(user.id, {
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setProfileSuccess(res.message || "Password updated successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[250px] bg-white border-r border-gray-200 flex flex-col">
      {/* Logo Section */}
      <div className=" border-b border-gray-200 flex items-center justify-center">
        <Image
          src={Logo}
          alt="The Khmer Today Logo"
          width={230}
          height={90}
          className="object-contain w-[180px] h-[110px]"
          priority
        />
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {/* Dashboard with Dropdown */}
          <li>
            <button
              onClick={() => setDashboardOpen(!dashboardOpen)}
              className="cursor-pointer w-full flex items-center justify-between px-4 py-2 text-left text-[#273C8F] hover:bg-gray-100 rounded-md transition-colors"
            >
              <span>Analytics</span>
              <svg
                className={`w-4 h-4 transition-transform ${dashboardOpen ? "rotate-180" : ""
                  }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {dashboardOpen && (
              <ul className="ml-4 mt-2 space-y-1">
                <li>
                  <Link
                    href="/dashboard"
                    className={getLinkClasses("/dashboard", true)}
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/web" className={getLinkClasses("/web", true)}>
                    Web
                  </Link>
                </li>
                <li>
                  <Link
                    href="/socialMedia"
                    className={getLinkClasses("/socialMedia", true)}
                  >
                    Social Media
                  </Link>
                </li>
              </ul>
            )}
          </li>

          {/* Article - No Dropdown */}
          <li>
            <Link
              href="/articleManagement"
              className={getLinkClasses("/articleManagement")}
            >
              Article Management
            </Link>
          </li>

          {/* Video - No Dropdown */}
          <li>
            <Link
              href="/videoManagement"
              className={getLinkClasses("/videoManagement")}
            >
              Video Management
            </Link>
          </li>

          {/* Guidelines */}
          <li>
            <Link href="/guidelines" className={getLinkClasses("/guidelines")}>
              Guidelines
            </Link>
          </li>

          {/* Media Library with Dropdown - SME Only */}
          {isUserSME && (
            <li>
              <>
                <button
                  onClick={() => setMediaLibraryOpen(!mediaLibraryOpen)}
                  className="w-full flex items-center justify-between px-4 py-2 text-left text-[#273C8F] hover:bg-gray-100 rounded-md transition-colors"
                >
                  <span>Media Library</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${mediaLibraryOpen ? "rotate-180" : ""
                      }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {mediaLibraryOpen && (
                  <ul className="ml-4 mt-2 space-y-1">
                    <li>
                      <Link
                        href="/covers"
                        className={getLinkClasses("/covers", true)}
                      >
                        Covers
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/contentImages"
                        className={getLinkClasses("/contentImages", true)}
                      >
                        Content Images
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/contentVideos"
                        className={getLinkClasses("/contentVideos", true)}
                      >
                        Content Videos
                      </Link>
                    </li>
                  </ul>
                )}
              </>
            </li>
          )}

          {/* Activity Log - SME Only */}
          {isUserSME && (
            <li>
              <Link
                href="/activityLog"
                className={getLinkClasses("/activityLog")}
              >
                Activity Log
              </Link>
            </li>
          )}

          {/* User Management - No Dropdown - SME Only */}
          {isUserSME && (
            <li>
              <Link
                href="/userManagement"
                className={getLinkClasses("/userManagement")}
              >
                User Management
              </Link>
            </li>
          )}

          {/* Category - No Dropdown - SME Only */}
          {isUserSME && (
            <li>
              <Link
                href="/categoryManagement"
                className={getLinkClasses("/categoryManagement")}
              >
                Categories Management
              </Link>
            </li>
          )}

          {/* Publisher - No Dropdown - SME Only */}
          {isUserSME && (
            <li>
              <Link
                href="/publishers"
                className={getLinkClasses("/publishers")}
              >
                Publishers
              </Link>
            </li>
          )}

          {/* Advertisement - No Dropdown - SME Only */}
          {isUserSME && (
            <li>
              <Link
                href="/advertisement"
                className={getLinkClasses("/advertisement")}
              >
                Advertisement
              </Link>
            </li>
          )}

          {/* Newsroom Team - No Dropdown - SME Only */}
          {isUserSME && (
            <li>
              <Link
                href="/newsroomTeam"
                className={getLinkClasses("/newsroomTeam")}
              >
                Newsroom Team
              </Link>
            </li>
          )}

          {/* Our Partners - No Dropdown - SME Only */}
          {isUserSME && (
            <li>
              <Link
                href="/ourPartner"
                className={getLinkClasses("/ourPartner")}
              >
                Our Partners
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* Profile at Bottom */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={() => setProfileOpen((prev) => !prev)}
          className="cursor-pointer w-full flex items-center justify-between gap-2 px-3 py-2 text-left rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1D2229] truncate">
              {user?.username || "Profile"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.gmail || ""}
            </p>
          </div>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${profileOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {profileOpen && (
          <div className="mt-2 space-y-1">
            <button
              onClick={() => {
                setProfileOpen(false);
                resetProfileModal();
                setIsProfileModalOpen(true);
              }}
              className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-sm text-[#273C8F] hover:bg-blue-50 rounded-md transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.121 17.804A10.954 10.954 0 0112 15c2.5 0 4.847.815 6.879 2.196M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => {
                setProfileOpen(false);
                logout();
                router.push("/login");
              }}
              className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>

      {isMounted &&
        isProfileModalOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm"
              style={{ zIndex: 10000 }}
              onClick={() => {
                setIsProfileModalOpen(false);
                resetProfileModal();
              }}
            />
            <div
              className="fixed inset-0 flex items-center justify-center p-4"
              style={{ zIndex: 10010 }}
            >
              <div
                className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-[#1D2229]">Edit Profile</h3>
                  <p className="text-xs text-gray-500 mt-1">Change your password</p>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Old Password</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={profileLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={profileLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={profileLoading}
                    />
                  </div>
                  {profileError && (
                    <p className="text-sm text-red-600">{profileError}</p>
                  )}
                  {profileSuccess && (
                    <p className="text-sm text-green-600">{profileSuccess}</p>
                  )}
                </div>
                <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      resetProfileModal();
                    }}
                    className="cursor-pointer px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                    disabled={profileLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePassword}
                    className="cursor-pointer px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    disabled={profileLoading}
                  >
                    {profileLoading ? "Updating..." : "Update"}
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </aside>
  );
}
