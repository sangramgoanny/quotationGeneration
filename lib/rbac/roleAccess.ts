// Frontend-only navigation / route visibility rules, keyed by the backend role
// code (GET /api/auth/me -> assignedRole.code, e.g. "SALES_EXECUTIVE").
//
// These rules only HIDE UI. The backend still enforces its own RBAC on every
// request, so this is a presentation layer on top of canView()/can(). Used by
// components/Sidebar.js and components/ConditionalLayout.tsx.

// Permission-catalog module ids the role must never see, even if the backend
// still returns a VIEW grant for them.
export const ROLE_DENIED_MODULES: Record<string, readonly string[]> = {
  SALES_EXECUTIVE: ["clients", "invoices", "receipts", "outstanding"],
};

// Sidebar section / leaf labels to hide outright. Covers nav entries that have
// no permission module id (e.g. "Expenses") and whole groups (e.g. "Finance").
export const ROLE_DENIED_NAV_LABELS: Record<string, readonly string[]> = {
  SALES_EXECUTIVE: ["Clients", "Finance", "Expenses", "Invoices", "Receipts"],
};

// Route path prefixes blocked for the role (ConditionalLayout guard). Kept
// separate from the module list because not every route is in lib/rbac/routes.ts.
export const ROLE_DENIED_PATH_PREFIXES: Record<string, readonly string[]> = {
  SALES_EXECUTIVE: ["/crm/clients", "/invoice", "/receipt", "/finance"],
};

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
