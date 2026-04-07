import { getApiUrl } from "@/lib/api-url";
import { getAdminHeaders, getStoredUser } from "@/services/auth";
import type {
  CreateUserPayload,
  RemovalRequest,
  User,
  UserResponse,
} from "@/types/auth";

/**
 * List all users (SME only). Uses same GET /user as auth.
 */
export async function listUsers(): Promise<User[]> {
  const response = await fetch(getApiUrl("/user"), {
    method: "GET",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "omit",
    mode: "cors",
  });
  if (!response.ok)
    throw new Error(`Failed to list users: ${response.statusText}`);
  const data: UserResponse = await response.json();
  return data.success && Array.isArray(data.data) ? data.data : [];
}

/**
 * Create a new user (SME only). POST /user
 */
export async function createUser(
  payload: CreateUserPayload,
): Promise<{ success: boolean; message?: string; data?: User }> {
  const response = await fetch(getApiUrl("/user"), {
    method: "POST",
    headers: getAdminHeaders(),
    credentials: "omit",
    mode: "cors",
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message || `Failed to create user: ${response.statusText}`,
    );
  }
  return data;
}

/**
 * Delete a user by id. Non-SME can be deleted directly; SME requires removal-request flow.
 */
export async function deleteUser(
  id: number,
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(getApiUrl(`/user/${id}`), {
    method: "DELETE",
    headers: getAdminHeaders(),
    credentials: "omit",
    mode: "cors",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message || `Failed to delete user: ${response.statusText}`,
    );
  }
  return data;
}

/**
 * Request removal of another SME (creates pending; target must accept/decline).
 * POST /user/removal-request
 */
export async function createRemovalRequest(
  targetUserId: number,
): Promise<{ success: boolean; data?: RemovalRequest; message?: string }> {
  const response = await fetch(getApiUrl("/user/removal-request"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "omit",
    mode: "cors",
    body: JSON.stringify({ target_user_id: targetUserId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message || `Failed to request removal: ${response.statusText}`,
    );
  }
  return data;
}

/**
 * List pending removal requests targeting the current user (so they can accept/decline).
 * GET /user/removal-requests
 */
export async function getMyRemovalRequests(): Promise<RemovalRequest[]> {
  const user = getStoredUser();
  if (!user) return [];
  const response = await fetch(getApiUrl("/user/removal-requests"), {
    method: "GET",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "omit",
    mode: "cors",
  });
  if (!response.ok) return [];
  const data = await response.json().catch(() => ({}));
  const list = data?.data ?? data?.removal_requests ?? [];
  return Array.isArray(list)
    ? list.filter((r: RemovalRequest) => r.status === "pending")
    : [];
}

/**
 * Accept a removal request (delete own account).
 */
export async function acceptRemovalRequest(
  requestId: number,
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(
    getApiUrl(`/user/removal-requests/${requestId}/accept`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "omit",
      mode: "cors",
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message || `Failed to accept: ${response.statusText}`,
    );
  }
  return data;
}

/**
 * Decline a removal request.
 */
export async function declineRemovalRequest(
  requestId: number,
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(
    getApiUrl(`/user/removal-requests/${requestId}/decline`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "omit",
      mode: "cors",
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message || `Failed to decline: ${response.statusText}`,
    );
  }
  return data;
}

/**
 * Change own password from profile popup.
 */
export async function changeMyPassword(
  userId: number,
  payload: {
    old_password: string;
    new_password: string;
    confirm_password: string;
  },
): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(getApiUrl(`/user/${userId}/change-password`), {
    method: "POST",
    headers: getAdminHeaders(),
    credentials: "omit",
    mode: "cors",
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message || `Failed to change password: ${response.statusText}`,
    );
  }
  return data;
}
