"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { AccessScope, BackendPermissionAction } from "@/types/rbac";
import { rbacApi, type AuthMe, type EffectivePermission } from "@/lib/api/rbac";
import { clearToken } from "@/utils/token";
import { setApiErrorHandlers } from "@/lib/api/request";
import { canPerform, canViewPermission, permissionScope } from "@/lib/rbac/access";

interface RbacContextValue {
  currentUser: AuthMe | null;
  permissions: Record<string, EffectivePermission>;
  loading: boolean;
  canView: (module: string) => boolean;
  can: (module: string, action: BackendPermissionAction) => boolean;
  scopeFor: (module: string) => AccessScope;
  isSuperAdmin: boolean;
  refetch: () => Promise<void>;
  notify: (message: string, tone?: "success" | "error" | "info") => void;
}

const RbacContext = createContext<RbacContextValue | null>(null);
const PUBLIC_PREFIXES = ["/login", "/admin/login"];

// The backend serializes its permission map with snake/lower-case module keys
// (e.g. "followups"), while the frontend catalog, routes and sidebar use
// camelCase ids (e.g. "followUps"). Mirror the aliases we rely on so
// canView("followUps") resolves instead of silently returning false.
const BACKEND_MODULE_ALIASES: Record<string, string> = {
  followups: "followUps",
  project_tasks: "projectTasks",
};

function normalizePermissionKeys(
  permissions: Record<string, EffectivePermission>,
): Record<string, EffectivePermission> {
  const next = { ...permissions };
  for (const [backendKey, frontendKey] of Object.entries(BACKEND_MODULE_ALIASES)) {
    if (next[backendKey] && !next[frontendKey]) next[frontendKey] = next[backendKey];
  }
  return next;
}

export function AuthRbacProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicPath = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "error" | "info" } | null>(null);

  const notify = useCallback((message: string, tone: "success" | "error" | "info" = "info") => {
    setNotice({ message, tone });
    window.setTimeout(() => setNotice(null), 4500);
  }, []);

  const handleUnauthorized = useCallback(() => {
    clearToken();
    setCurrentUser(null);
    const from = window.location.pathname;
    router.replace(`/login?from=${encodeURIComponent(from)}`);
  }, [router]);

  const handleForbidden = useCallback((message: string) => notify(message || "You do not have permission to perform this action.", "error"), [notify]);

  useEffect(() => setApiErrorHandlers({ onUnauthorized: handleUnauthorized, onForbidden: handleForbidden }), [handleForbidden, handleUnauthorized]);

  const refetch = useCallback(async () => {
    if (PUBLIC_PREFIXES.some((prefix) => window.location.pathname.startsWith(prefix))) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const me = await rbacApi.me();
      setCurrentUser({ ...me, permissions: normalizePermissionKeys(me.permissions ?? {}) });
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refetch(); }, [isPublicPath, refetch]);

  const permissions = currentUser?.permissions ?? {};
  const canView = useCallback((module: string) => canViewPermission(permissions[module]), [permissions]);
  const can = useCallback((module: string, action: BackendPermissionAction) => canPerform(permissions[module], action), [permissions]);
  const scopeFor = useCallback((module: string) => permissionScope(permissions[module]), [permissions]);
  const isSuperAdmin = currentUser?.assignedRole?.code === "SUPER_ADMIN";

  const value = useMemo<RbacContextValue>(() => ({ currentUser, permissions, loading, canView, can, scopeFor, isSuperAdmin, refetch, notify }), [can, canView, currentUser, isSuperAdmin, loading, notify, permissions, refetch, scopeFor]);

  return (
    <RbacContext.Provider value={value}>
      {children}
      {notice && (
        <div role="status" aria-live="polite" className={`fixed right-4 top-4 z-[200] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-xl ${notice.tone === "error" ? "border-red-200 bg-red-50 text-red-700" : notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-indigo-200 bg-indigo-50 text-indigo-700"}`}>
          {notice.message}
        </div>
      )}
    </RbacContext.Provider>
  );
}

export function useAuthRbac(): RbacContextValue {
  const value = useContext(RbacContext);
  if (!value) throw new Error("useAuthRbac must be used inside AuthRbacProvider");
  return value;
}