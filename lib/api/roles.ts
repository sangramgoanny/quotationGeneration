import { request } from "./request";

export interface BackendRole {
  id: string;
  name: string;
  code: string;
  description?: string;
  department?: string;
  type: "SYSTEM" | "CUSTOM";
  status: "ACTIVE" | "INACTIVE";
  userCount: number;
}

interface Res<T> { success: boolean; data: T }

export const backendRolesApi = {
  async list(): Promise<BackendRole[]> {
    const response = await request<Res<BackendRole[]>>("/api/roles");
    return response.data;
  },
};