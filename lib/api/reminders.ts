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
}

interface Res<T> { success: boolean; data: T }

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
      body: JSON.stringify(data),
    });
    return r.data;
  },

  async update(clientId: string, remId: string, data: {
    isDone?: boolean;
    scheduledAt?: string;
    note?: string;
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
};
