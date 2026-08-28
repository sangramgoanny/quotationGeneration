import type { AccessScope, ModulePermission, PermissionPreset } from "@/types/rbac";
import { PERMISSION_CATALOG_BY_ID } from "@/lib/rbac/catalog";

const ACTION_KEYS = ["create", "edit", "delete", "assign", "reassign", "export", "approve", "upload", "download"] as const;

export function emptyModulePermission(moduleId: string, scope: AccessScope = "NONE"): ModulePermission {
  return {
    module: moduleId,
    scope,
    create: false,
    edit: false,
    delete: false,
    assign: false,
    reassign: false,
    export: false,
    approve: false,
    upload: false,
    download: false,
  };
}

// Zeroes out actions that don't exist for this module, and normalizes scope
// for modules that don't support Own/Team/All (they're binary: accessible or not).
export function sanitizeToModule(mp: ModulePermission, moduleId: string): ModulePermission {
  const def = PERMISSION_CATALOG_BY_ID[moduleId];
  if (!def) return mp;
  const allowed = new Set(def.actions);
  const next: ModulePermission = { ...mp };
  for (const action of ACTION_KEYS) {
    if (!allowed.has(action)) next[action] = false;
  }
  if (!def.scoped && next.scope !== "NONE") next.scope = "ALL";
  return next;
}

// §9 dependency logic. `changed` is the field the user just edited — the
// rules apply differently depending on direction of intent:
//  - the user explicitly set Data Scope: that always wins (None clears actions).
//  - the user toggled an action that implies broader visibility (Assign/Reassign):
//    scope is auto-bumped up from None/Own to Team, since you can't assign work
//    to teammates you can only see your own records.
export function applyDependencyRules(mp: ModulePermission, changed: keyof ModulePermission): ModulePermission {
  const next: ModulePermission = { ...mp };

  if (changed === "scope") {
    if (next.scope === "NONE") {
      for (const action of ACTION_KEYS) next[action] = false;
    }
    return next;
  }

  if ((changed === "assign" || changed === "reassign") && next[changed] && (next.scope === "NONE" || next.scope === "OWN")) {
    next.scope = "TEAM";
  }

  // Safety net: any action enabled while scope is still None means scope must
  // rise to at least Own (shouldn't happen if the UI disables toggles at None,
  // but keeps the data model internally consistent regardless of caller).
  if (next.scope === "NONE" && ACTION_KEYS.some((action) => next[action])) {
    next.scope = "OWN";
  }

  return sanitizeToModule(next, next.module);
}

export function applyPreset(mp: ModulePermission, preset: PermissionPreset): ModulePermission {
  const base = emptyModulePermission(mp.module);
  let next: ModulePermission;
  switch (preset) {
    case "FULL_ACCESS":
      next = { ...base, scope: "ALL", create: true, edit: true, delete: true, assign: true, reassign: true, export: true, approve: true, upload: true, download: true };
      break;
    case "MANAGER_ACCESS":
      next = { ...base, scope: "TEAM", create: true, edit: true, assign: true, reassign: true, export: true, upload: true, download: true };
      break;
    case "STANDARD_USER":
      next = { ...base, scope: "OWN", create: true, edit: true, upload: true, download: true };
      break;
    case "READ_ONLY":
      next = { ...base, scope: mp.scope === "NONE" ? "ALL" : mp.scope, download: true };
      break;
    case "NO_ACCESS":
    default:
      next = base;
  }
  return sanitizeToModule(next, mp.module);
}

export interface PermissionSummary {
  totalModules: number;
  accessibleCount: number;
  fullCount: number;
  teamCount: number;
  ownCount: number;
  noAccessCount: number;
  exportEnabled: boolean;
  deleteEnabled: boolean;
  userManagementEnabled: boolean;
}

export function summarize(permissions: ModulePermission[]): PermissionSummary {
  return {
    totalModules: permissions.length,
    accessibleCount: permissions.filter((p) => p.scope !== "NONE").length,
    fullCount: permissions.filter((p) => p.scope === "ALL").length,
    teamCount: permissions.filter((p) => p.scope === "TEAM").length,
    ownCount: permissions.filter((p) => p.scope === "OWN").length,
    noAccessCount: permissions.filter((p) => p.scope === "NONE").length,
    exportEnabled: permissions.some((p) => p.export),
    deleteEnabled: permissions.some((p) => p.delete),
    userManagementEnabled: permissions.some((p) => (p.module === "users" || p.module === "rolesPermissions") && p.scope !== "NONE"),
  };
}

export const PRESET_LABELS: Record<PermissionPreset, string> = {
  FULL_ACCESS: "Full Access",
  MANAGER_ACCESS: "Manager Access",
  STANDARD_USER: "Standard User",
  READ_ONLY: "Read Only",
  NO_ACCESS: "No Access",
};

export const PRESET_ORDER: PermissionPreset[] = ["FULL_ACCESS", "MANAGER_ACCESS", "STANDARD_USER", "READ_ONLY", "NO_ACCESS"];
