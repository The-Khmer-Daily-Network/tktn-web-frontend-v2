import { getApiUrl, isApiConfigured } from "@/lib/api-url";
import type { LoginCredentials, User, UserResponse } from "@/types/auth";

if (!isApiConfigured()) {
  console.warn(
    "NEXT_PUBLIC_API_BASE_URL is not defined in environment variables",
  );
}

/**
 * Fetch current user data from /user endpoint
 * This endpoint returns all users, so we need to filter by credentials
 */
export async function getCurrentUser(
  credentials?: LoginCredentials,
): Promise<User | null> {
  try {
    const url = getApiUrl("/user");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "omit",
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch user: ${response.status} ${response.statusText}`,
      );
    }

    const data: UserResponse = await response.json();

    if (!data.success || !data.data || data.data.length === 0) {
      return null;
    }

    // If credentials provided, find matching user
    if (credentials) {
      const user = data.data.find(
        (u) =>
          u.gmail === credentials.gmail && u.password === credentials.password,
      );
      return user || null;
    }

    // For now, return the first user if no credentials provided
    // In a real app, you'd use session/token authentication
    return data.data[0] || null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

/**
 * Login user with credentials
 */
export async function login(
  credentials: LoginCredentials,
): Promise<User | null> {
  try {
    const user = await getCurrentUser(credentials);

    if (user) {
      // Store user in localStorage for persistence
      if (typeof window !== "undefined") {
        localStorage.setItem("currentUser", JSON.stringify(user));
      }
      return user;
    }

    return null;
  } catch (error) {
    console.error("Error logging in:", error);
    return null;
  }
}

/**
 * Logout user
 */
export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("currentUser");
  }
}

/**
 * Get stored user from localStorage
 */
export function getStoredUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem("currentUser");
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as User;
  } catch (error) {
    console.error("Error parsing stored user:", error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getStoredUser() !== null;
}

/**
 * Check if user has SME role
 */
export function isSME(user: User | null): boolean {
  return user?.role === "SME";
}

/**
 * Headers for admin JSON API requests (POST/PUT/DELETE with JSON body).
 * Sends actor so backend can log who performed the action.
 */
export function getAdminHeaders(): Record<string, string> {
  const user = getStoredUser();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (user?.username) headers["X-Actor-Username"] = user.username;
  if (user?.id != null) headers["X-Actor-Id"] = String(user.id);
  return headers;
}

/**
 * Actor-only headers for admin requests with FormData (upload).
 * Do not set Content-Type so fetch can set multipart/form-data.
 */
export function getAdminActorHeaders(): Record<string, string> {
  const user = getStoredUser();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (user?.username) headers["X-Actor-Username"] = user.username;
  if (user?.id != null) headers["X-Actor-Id"] = String(user.id);
  return headers;
}
