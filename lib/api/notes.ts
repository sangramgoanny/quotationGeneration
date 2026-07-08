import { request } from "./request";

export interface LeadNote {
  id:          string;
  clientId:    string;
  text:        string;
  createdById: string;
  createdBy:   { id: string; name: string } | null;
  createdAt:   string;
}

interface Res<T> { success: boolean; data: T }

export const notesApi = {
  async list(clientId: string): Promise<LeadNote[]> {
    const r = await request<Res<LeadNote[]>>(`/api/clients/${clientId}/notes`);
    return r.data;
  },

  async create(clientId: string, text: string): Promise<LeadNote> {
    const r = await request<Res<LeadNote>>(`/api/clients/${clientId}/notes`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    return r.data;
  },

  async delete(clientId: string, noteId: string): Promise<void> {
    await request<void>(`/api/clients/${clientId}/notes/${noteId}`, {
      method: "DELETE",
    });
  },
};
