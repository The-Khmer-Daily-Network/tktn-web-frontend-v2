export interface ActivityLog {
  id: number;
  actor_username: string | null;
  actor_id: number | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ActivityLogsResponse {
  success: boolean;
  data: ActivityLog[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}
