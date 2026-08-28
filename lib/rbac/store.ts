import type { AuditEntityType, ModulePermission, Role, Team, UserAccess } from "@/types/rbac";
import { rbacApi, type AuditLogQuery, type RoleUpdatePayload, type RoleWritePayload, type TeamWritePayload, type UserAccessUpdatePayload } from "@/lib/api/rbac";

export type CreateRolePayload = RoleWritePayload;
export type UpdateRolePayload = RoleUpdatePayload;
export type TeamPayload = TeamWritePayload;

export const rolesApi = {
  list: rbacApi.roles,
  get: rbacApi.role,
  create: rbacApi.createRole,
  update: rbacApi.updateRole,
  remove: rbacApi.deleteRole,
  duplicate: rbacApi.duplicateRole,
  setStatus(id: string, status: Role["status"]) { return rbacApi.updateRole(id, { status }); },
};

export const teamsApi = {
  list: rbacApi.teams,
  create: rbacApi.createTeam,
  update: rbacApi.updateTeam,
  remove: rbacApi.deleteTeam,
};

export const departmentsApi = {
  list: rbacApi.departments,
  create: rbacApi.createDepartment,
  remove: rbacApi.deleteDepartment,
};

export const userAccessApi = {
  get(userId: string): Promise<UserAccess> { return rbacApi.userAccess(userId); },
  listByRole(roleId: string): Promise<UserAccess[]> { return rbacApi.roleUsers(roleId); },
  updateAccess(userId: string, patch: UserAccessUpdatePayload): Promise<UserAccess> { return rbacApi.updateUserAccess(userId, patch); },
  assignRole(userId: string, roleId: string): Promise<UserAccess> { return rbacApi.updateUserAccess(userId, { roleId }); },
  assignUsers(roleId: string, users: { id: string }[]): Promise<void> { return rbacApi.bulkAssign(roleId, users.map((user) => user.id)); },
  setOverride(userId: string, overrides: Partial<ModulePermission>[]): Promise<UserAccess> { return rbacApi.setOverrides(userId, overrides); },
  clearOverride(userId: string): Promise<UserAccess> { return rbacApi.clearOverrides(userId); },
};

export const auditApi = {
  list(filters: AuditLogQuery = {}) { return rbacApi.auditLogs(filters); },
};

export type { AuditLogQuery, Team, AuditEntityType };