"use client";

import { useCallback } from "react";
import type { BackendPermissionAction, PermissionAction } from "@/types/rbac";
import { useAuthRbac } from "@/lib/rbac/AuthRbacProvider";

const ACTION_MAP: Record<PermissionAction, BackendPermissionAction> = {
  view: "VIEW", create: "CREATE", edit: "EDIT", delete: "DELETE", assign: "ASSIGN",
  reassign: "REASSIGN", export: "EXPORT", approve: "APPROVE", upload: "UPLOAD", download: "DOWNLOAD",
};

export function usePermissions() {
  const rbac = useAuthRbac();
  const can = useCallback((moduleId: string, action: PermissionAction) => rbac.can(moduleId, ACTION_MAP[action]), [rbac]);
  return {
    can,
    canView: rbac.canView,
    getScope: rbac.scopeFor,
    loading: rbac.loading,
    roleName: rbac.currentUser?.assignedRole?.name ?? null,
    currentUser: rbac.currentUser,
    isSuperAdmin: rbac.isSuperAdmin,
    refetch: rbac.refetch,
  };
}