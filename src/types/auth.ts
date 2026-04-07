export interface User {
  id: number;
  gmail: string;
  password: string;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface UserResponse {
  success: boolean;
  data: User[];
}

export interface LoginCredentials {
  gmail: string;
  password: string;
}

/** Payload to create a new user (SME only) */
export interface CreateUserPayload {
  gmail: string;
  password: string;
  username: string;
  role: string;
}

/** Pending removal request: SME A requested removal of SME B; B must accept/decline */
export interface RemovalRequest {
  id: number;
  target_user_id: number;
  requested_by_user_id: number;
  requested_by_username?: string;
  status: "pending" | "accepted" | "declined";
  created_at?: string;
}
