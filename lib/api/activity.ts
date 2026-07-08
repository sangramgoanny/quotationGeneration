import { request } from "./request";

export interface ActivityLog {
  id:          string;
  clientId?:   string;
  userId?:     string;
  userName?:   string;          // email address from backend
  action:      string;
  description: string;
  createdAt:   string;
  user?: {
    id:   string;
    name: string;               // display name — prefer this over userName
  };
}

interface ListRes {
  success: boolean;
  data: {
    logs:       ActivityLog[];
    pagination: { total: number; page: number; limit: number; pages: number };
  };
}

interface SingleRes { success: boolean; data: ActivityLog }

export const activityApi = {
  async list(clientId: string, page = 1, limit = 50): Promise<ActivityLog[]> {
    const r = await request<ListRes>(
      `/api/clients/${clientId}/activity?page=${page}&limit=${limit}`
    );
    return r.data.logs;           // ← nested under data.logs
  },

  async create(clientId: string, action: string, description: string): Promise<ActivityLog> {
    const r = await request<SingleRes>(`/api/clients/${clientId}/activity`, {
      method: "POST",
      body: JSON.stringify({ action, description }),
    });
    return r.data;
  },
};
