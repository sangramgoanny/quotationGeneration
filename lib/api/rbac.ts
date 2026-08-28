import { request } from "@/lib/api/request";
import type {
  AccessScope,
  AuditEntityType,
  AuditLogEntry,
  Department,
  ModulePermission,
  BackendPermissionAction,
  BackendPermissionModuleDef,
  Role,
  RoleStatus,
  RoleWithUserCount,
  Team,
  UserAccess,
} from "@/types/rbac";
import type { User } from "@/lib/api/users";

export interface ApiSuccess<T> { success: true; data: T }

export interface EffectivePermission {
  scope: AccessScope;
  actions: BackendPermissionAction[];
}

export interface AuthMe extends User {
  permissions: Record<string, EffectivePermission>;
}

export interface RoleWritePayload {
  name: string;
  description?: string;
  department?: string;
  permissions?: ModulePermission[];
}

export interface RoleUpdatePayload extends Partial<RoleWritePayload> {
  status?: RoleStatus;
}

export interface TeamWritePayload {
  name: string;
  department?: string;
  managerId?: string;
  memberIds?: string[];
}

export interface UserAccessUpdatePayload {
  roleId?: string;
  department?: string;
  team?: string;
  reportingManagerId?: string;
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  entityType?: AuditEntityType;
  search?: string;
}

export interface AuditLogPage {
  entries: AuditLogEntry[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function queryString(values: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}

export const rbacApi = {
  async me(): Promise<AuthMe> {
    return (await request<ApiSuccess<AuthMe>>("/api/auth/me")).data;
  },

  async modules(): Promise<BackendPermissionModuleDef[]> {
    const modules = (await request<ApiSuccess<BackendPermissionModuleDef[]>>("/api/rbac/modules")).data;
    return [...modules].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async roles(): Promise<RoleWithUserCount[]> {
    return (await request<ApiSuccess<RoleWithUserCount[]>>("/api/roles")).data;
  },
  async role(id: string): Promise<RoleWithUserCount> {
    return (await request<ApiSuccess<RoleWithUserCount>>(`/api/roles/${id}`)).data;
  },
  async createRole(payload: RoleWritePayload): Promise<Role> {
    return (await request<ApiSuccess<Role>>("/api/roles", { method: "POST", body: JSON.stringify(payload) })).data;
  },
  async updateRole(id: string, payload: RoleUpdatePayload): Promise<Role> {
    return (await request<ApiSuccess<Role>>(`/api/roles/${id}`, { method: "PATCH", body: JSON.stringify(payload) })).data;
  },
  async deleteRole(id: string): Promise<void> {
    await request<void>(`/api/roles/${id}`, { method: "DELETE" });
  },
  async duplicateRole(id: string, name?: string): Promise<Role> {
    return (await request<ApiSuccess<Role>>(`/api/roles/${id}/duplicate`, { method: "POST", body: JSON.stringify(name ? { name } : {}) })).data;
  },
  async roleUsers(id: string): Promise<UserAccess[]> {
    return (await request<ApiSuccess<UserAccess[]>>(`/api/roles/${id}/users`)).data;
  },

  async users(search?: string): Promise<User[]> {
    return (await request<ApiSuccess<User[]>>(`/api/users${queryString({ search })}`)).data;
  },
  async user(id: string): Promise<User> {
    return (await request<ApiSuccess<User>>(`/api/users/${id}`)).data;
  },

  async userAccess(userId: string): Promise<UserAccess> {
    return (await request<ApiSuccess<UserAccess>>(`/api/user-access/${userId}`)).data;
  },
  async updateUserAccess(userId: string, payload: UserAccessUpdatePayload): Promise<UserAccess> {
    return (await request<ApiSuccess<UserAccess>>(`/api/user-access/${userId}`, { method: "PATCH", body: JSON.stringify(payload) })).data;
  },
  async bulkAssign(roleId: string, userIds: string[]): Promise<void> {
    await request<void>("/api/user-access/bulk-assign", { method: "POST", body: JSON.stringify({ roleId, userIds }) });
  },
  async setOverrides(userId: string, overrides: Partial<ModulePermission>[]): Promise<UserAccess> {
    return (await request<ApiSuccess<UserAccess>>(`/api/user-access/${userId}/overrides`, { method: "PUT", body: JSON.stringify({ overrides }) })).data;
  },
  async clearOverrides(userId: string): Promise<UserAccess> {
    return (await request<ApiSuccess<UserAccess>>(`/api/user-access/${userId}/overrides`, { method: "DELETE" })).data;
  },

  async teams(): Promise<Team[]> {
    return (await request<ApiSuccess<Team[]>>("/api/teams")).data;
  },
  async createTeam(payload: TeamWritePayload): Promise<Team> {
    return (await request<ApiSuccess<Team>>("/api/teams", { method: "POST", body: JSON.stringify(payload) })).data;
  },
  async updateTeam(id: string, payload: Partial<TeamWritePayload>): Promise<Team> {
    return (await request<ApiSuccess<Team>>(`/api/teams/${id}`, { method: "PATCH", body: JSON.stringify(payload) })).data;
  },
  async deleteTeam(id: string): Promise<void> {
    await request<void>(`/api/teams/${id}`, { method: "DELETE" });
  },

  async departments(): Promise<Department[]> {
    return (await request<ApiSuccess<Department[]>>("/api/departments")).data;
  },
  async createDepartment(name: string): Promise<Department> {
    return (await request<ApiSuccess<Department>>("/api/departments", { method: "POST", body: JSON.stringify({ name }) })).data;
  },
  async deleteDepartment(id: string): Promise<void> {
    await request<void>(`/api/departments/${id}`, { method: "DELETE" });
  },

  async auditLogs(query: AuditLogQuery = {}): Promise<AuditLogPage> {
    return (await request<ApiSuccess<AuditLogPage>>(`/api/audit-logs${queryString(query as Record<string, string | number | undefined>)}`)).data;
  },
};