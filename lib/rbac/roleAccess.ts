// Frontend-only navigation / route visibility rules, keyed by the backend role
// code (GET /api/auth/me -> assignedRole.code, e.g. "SALES_EXECUTIVE").
//
// These rules only HIDE UI. The backend still enforces its own RBAC on every
// request, so this is a presentation layer on top of canView()/can(). Used by
// components/Sidebar.js and components/ConditionalLayout.tsx.

// Permission-catalog module ids the role must never see, even if the backend
// still returns a VIEW grant for them.
export const ROLE_DENIED_MODULES: Record<string, readonly string[]> = {
  SALES_EXECUTIVE: [
    "invoices",
    "receipts",
    "outstanding",
    "expenses",
    "projects",
    "projectTasks",
  ],
};

// Sidebar section / leaf labels to hide outright. Covers nav entries that have
// no permission module id (e.g. "Expenses") and whole groups (e.g. "Finance").
export const ROLE_DENIED_NAV_LABELS: Record<string, readonly string[]> = {
  SALES_EXECUTIVE: [
    "Finance",
    "Expenses",
    "Invoices",
    "Receipts",
    "Projects",
    "Tasks",
  ],
};

// Route path prefixes blocked for the role (ConditionalLayout guard). Kept
// separate from the module list because not every route is in lib/rbac/routes.ts.
export const ROLE_DENIED_PATH_PREFIXES: Record<string, readonly string[]> = {
  SALES_EXECUTIVE: ["/invoice", "/receipt", "/finance", "/projects"],
};

// The backend enum a legacy user (no assignedRole) carries, mapped to the role
// code the deny lists above are keyed on. Without this, a legacy STAFF/MANAGER
// user with roleId=null bypasses every rule here. See rbac-sales-executive-audit F5.
const LEGACY_ROLE_CODE: Record<string, string> = {
  ADMIN: "ADMIN",
  MANAGER: "SALES_MANAGER",
  STAFF: "SALES_EXECUTIVE",
};

export function resolveRoleCode(
  user: { assignedRole?: { code?: string | null } | null; role?: string | null } | null | undefined,
): string | null {
  return user?.assignedRole?.code ?? (user?.role ? LEGACY_ROLE_CODE[user.role] ?? null : null);
}

export function isModuleDeniedForRole(
  roleCode: string | null | undefined,
  moduleId: string | null | undefined,
): boolean {
  if (!roleCode || !moduleId) return false;
  return (ROLE_DENIED_MODULES[roleCode] ?? []).includes(moduleId);
}

export function isNavLabelDeniedForRole(
  roleCode: string | null | undefined,
  label: string,
): boolean {
  if (!roleCode) return false;
  return (ROLE_DENIED_NAV_LABELS[roleCode] ?? []).includes(label);
}

export function isPathDeniedForRole(
  roleCode: string | null | undefined,
  pathname: string,
): boolean {
  if (!roleCode) return false;
  return (ROLE_DENIED_PATH_PREFIXES[roleCode] ?? []).some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
