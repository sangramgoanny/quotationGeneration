import type { AccessScope, BackendPermissionAction } from "@/types/rbac";
import type { EffectivePermission } from "@/lib/api/rbac";

export function canViewPermission(permission?: EffectivePermission): boolean {
  return Boolean(permission && permission.scope !== "NONE" && permission.actions.includes("VIEW"));
}

export function canPerform(permission: EffectivePermission | undefined, action: BackendPermissionAction): boolean {
  return Boolean(permission && permission.scope !== "NONE" && permission.actions.includes(action));
}

export function permissionScope(permission?: EffectivePermission): AccessScope {
  return permission?.scope ?? "NONE";
}