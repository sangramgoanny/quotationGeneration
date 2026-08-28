import { request } from "./request";

export const USER_ROLES = ["ADMIN", "MANAGER", "STAFF"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id:        string;
  name:      string;
  email:     string;
  role:      UserRole;
  roleId:    string | null;
  assignedRole: { id: string; name: string; code: string } | null;
  isActive:  boolean;
  createdAt: string;
}

interface Res<T> { success: boolean; data: T }

export const usersApi = {
  async list(params?: { role?: UserRole; search?: string; isActive?: boolean; assignableTo?: string }): Promise<User[]> {
    const p = new URLSearchParams();
    if (params?.role)   p.set("role",   params.role);
    if (params?.search) p.set("search", params.search);
    if (params?.isActive !== undefined) p.set("isActive", String(params.isActive));
    if (params?.assignableTo) p.set("assignableTo", params.assignableTo);
    const qs = p.toString();
    const r = await request<Res<User[]>>(`/api/users${qs ? `?${qs}` : ""}`);
    return r.data;
  },

  async get(id: string): Promise<User> {
    const r = await request<Res<User>>(`/api/users/${id}`);
    return r.data;
  },

  async create(data: { name: string; email: string; password: string; role?: UserRole; roleId?: string }): Promise<User> {
    const r = await request<Res<User>>("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return r.data;
  },

  async update(id: string, data: Partial<{ name: string; email: string; role: UserRole; roleId: string; isActive: boolean }>): Promise<User> {
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
