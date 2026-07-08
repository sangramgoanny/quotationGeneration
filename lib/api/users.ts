import { request } from "./request";

export type UserRole = "ADMIN" | "MANAGER" | "STAFF";

export interface User {
  id:        string;
  name:      string;
  email:     string;
  role:      UserRole;
  isActive:  boolean;
  createdAt: string;
}

interface Res<T> { success: boolean; data: T }

export const usersApi = {
  async list(params?: { role?: UserRole; search?: string }): Promise<User[]> {
    const p = new URLSearchParams();
    if (params?.role)   p.set("role",   params.role);
    if (params?.search) p.set("search", params.search);
    const qs = p.toString();
    const r = await request<Res<User[]>>(`/api/users${qs ? `?${qs}` : ""}`);
    return r.data;
  },

  async get(id: string): Promise<User> {
    const r = await request<Res<User>>(`/api/users/${id}`);
    return r.data;
  },

  async create(data: { name: string; email: string; password: string; role: UserRole }): Promise<User> {
    const r = await request<Res<User>>("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return r.data;
  },

  async update(id: string, data: Partial<{ name: string; email: string; role: UserRole; isActive: boolean }>): Promise<User> {
    const r = await request<Res<User>>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return r.data;
  },

  async delete(id: string): Promise<void> {
    await request<void>(`/api/users/${id}`, { method: "DELETE" });
  },
};
