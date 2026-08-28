export type AccessScope = "NONE" | "OWN" | "TEAM" | "ALL";
export type BackendPermissionAction = "VIEW" | "CREATE" | "EDIT" | "DELETE" | "ASSIGN" | "REASSIGN" | "EXPORT" | "APPROVE" | "UPLOAD" | "DOWNLOAD";
export type PermissionAction = "view" | "create" | "edit" | "delete" | "assign" | "reassign" | "export" | "approve" | "upload" | "download";

export interface ModulePermission {
  module: string;
  scope: AccessScope;
  create: boolean;
  edit: boolean;
  delete: boolean;
  assign: boolean;
  reassign: boolean;
  export: boolean;
  approve: boolean;
  upload: boolean;
  download: boolean;
}
export type RoleType = "SYSTEM" | "CUSTOM";
export type RoleStatus = "ACTIVE" | "INACTIVE";
export interface Role {
  id: string; name: string; code: string; description?: string; department?: string;
  type: RoleType; status: RoleStatus; permissions: ModulePermission[]; createdAt: string; updatedAt: string;
}
export interface RoleWithUserCount extends Role { userCount: number }
export interface Team { id: string; name: string; department?: string; managerId?: string; memberIds: string[]; createdAt: string }
export interface Department { id: string; name: string; createdAt: string }
export interface UserAccess {
  userId: string; roleId: string; department?: string; team?: string; reportingManagerId?: string;
  overrides?: Partial<ModulePermission>[] | null; updatedAt: string;
}
export interface AuditChange { field: string; from: unknown; to: unknown }
export type AuditEntityType = "ROLE" | "TEAM" | "DEPARTMENT" | "USER_ACCESS";
export interface AuditLogEntry {
  id: string; actorName: string; action: string; entityType: AuditEntityType; entityId: string;
  entityName: string; changes: AuditChange[]; createdAt: string;
}
export interface BackendPermissionModuleDef { key: string; label: string; sortOrder: number }
export interface PermissionModuleDef {
  id: string; label: string; group: string; scoped: boolean; actions: PermissionAction[];
}
export type PermissionPreset = "FULL_ACCESS" | "MANAGER_ACCESS" | "STANDARD_USER" | "READ_ONLY" | "NO_ACCESS";