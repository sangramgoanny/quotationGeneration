import { request } from "./request";

export type ReminderType = "FOLLOW_UP" | "CALL" | "MEETING";

export interface LeadReminder {
  id:          string;
  clientId:    string;
  type:        ReminderType;
  title:       string;
  scheduledAt: string;
  note:        string;
  isDone:      boolean;
  createdById: string;
  createdAt:   string;
  updatedAt?: string;
  completedAt?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH";
  assignedUser?: { id: string; name: string; email?: string } | null;
  client?: {
    id: string;
    companyName: string;
    status: string;
    contactPersonName?: string;
    mobile?: string;
    primaryEmail?: string;
  };
}

interface Res<T> { success: boolean; data: T }
export type ReminderStatus = "ALL" | "OPEN" | "COMPLETED" | "OVERDUE" | "DUE_TODAY" | "UPCOMING";
export interface ReminderFilters {
  search?: string; status?: ReminderStatus; priority?: "LOW" | "MEDIUM" | "HIGH";
  type?: ReminderType; assignedUserId?: string; clientId?: string; fromDate?: string; toDate?: string; page?: number; limit?: number;
}
export interface ReminderListResponse {
  data: LeadReminder[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
export interface ReminderSummary {
  total: number; open: number; overdue: number; dueToday: number; upcoming: number; completed: number; highPriority: number;
}

export const REMINDER_TYPE_TO_API: Record<string, ReminderType> = {
  "Follow-up": "FOLLOW_UP",
  "Call":      "CALL",
  "Meeting":   "MEETING",
};

export const REMINDER_TYPE_FROM_API: Record<ReminderType, string> = {
  FOLLOW_UP: "Follow-up",
  CALL:      "Call",
  MEETING:   "Meeting",
};

export const remindersApi = {
  async globalList(filters: ReminderFilters = {}): Promise<ReminderListResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
    const r = await request<{ success: boolean; data: { reminders: LeadReminder[]; pagination: ReminderListResponse } }>(`/api/reminders${params.toString() ? `?${params.toString()}` : ""}`);
    return { data: r.data.reminders, ...r.data.pagination };
  },

  async summary(): Promise<ReminderSummary> {
    const r = await request<{ success: boolean; data: ReminderSummary }>("/api/reminders/summary");
    return r.data;
  },

  async list(clientId: string): Promise<LeadReminder[]> {
    const r = await request<Res<LeadReminder[]>>(`/api/clients/${clientId}/reminders`);
    return r.data;
  },

  async create(clientId: string, data: {
    type: ReminderType;
    title: string;
    scheduledAt: string;
    note?: string;
  }): Promise<LeadReminder> {
    const r = await request<Res<LeadReminder>>(`/api/clients/${clientId}/reminders`, {
      method: "POST",
      body: JSON.stringify({ clientId, ...data }),
    });
    return r.data;
  },

  async update(clientId: string, remId: string, data: {
    isDone?: boolean;
    scheduledAt?: string;
    note?: string;
    title?: string;
    type?: ReminderType;
    priority?: "LOW" | "MEDIUM" | "HIGH";
    assignedUserId?: string | null;
  }): Promise<LeadReminder> {
    const r = await request<Res<LeadReminder>>(`/api/clients/${clientId}/reminders/${remId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return r.data;
  },

  async delete(clientId: string, remId: string): Promise<void> {
    await request<void>(`/api/clients/${clientId}/reminders/${remId}`, {
      method: "DELETE",
    });
  },

  async globalUpdate(id: string, data: { isDone?: boolean; scheduledAt?: string; note?: string; title?: string; type?: ReminderType; priority?: "LOW" | "MEDIUM" | "HIGH"; assignedUserId?: string | null }): Promise<LeadReminder> {
    const r = await request<Res<LeadReminder>>(`/api/reminders/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    return r.data;
  },
};
