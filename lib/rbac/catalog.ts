import type { PermissionModuleDef } from "@/types/rbac";

// ─── Permission catalog ─────────────────────────────────────────────────────
// Single source of truth for every module RBAC can grant access to. The
// roles table, role editor, sidebar gating, and the Invoices worked example
// all read from this list — never hard-code a module id/action elsewhere.

export const PERMISSION_GROUPS = [
  "CRM",
  "Sales",
  "Finance",
  "Project Management",
  "Documents",
  "Reporting",
  "Administration",
] as const;

export type PermissionGroup = (typeof PERMISSION_GROUPS)[number];

export const PERMISSION_CATALOG: PermissionModuleDef[] = [
  // ── CRM ──────────────────────────────────────────────────────────────────
  { id: "dashboard",  label: "Dashboard",  group: "CRM", scoped: false, actions: ["view"] },
  { id: "leads",      label: "Leads",      group: "CRM", scoped: true,  actions: ["view", "create", "edit", "delete", "assign", "reassign", "export"] },
  { id: "clients",    label: "Clients",    group: "CRM", scoped: true,  actions: ["view", "create", "edit", "delete", "assign", "export"] },
  { id: "contacts",   label: "Contacts",   group: "CRM", scoped: true,  actions: ["view", "create", "edit", "delete"] },
  { id: "activities", label: "Activities", group: "CRM", scoped: true,  actions: ["view", "create", "edit", "delete", "assign"] },
  { id: "followUps",  label: "Follow-ups", group: "CRM", scoped: true,  actions: ["view", "create", "edit", "delete", "assign"] },
  { id: "tasks",      label: "Tasks",      group: "CRM", scoped: true,  actions: ["view", "create", "edit", "delete", "assign"] },

  // ── Sales ────────────────────────────────────────────────────────────────
  { id: "quotations", label: "Quotations", group: "Sales", scoped: true, actions: ["view", "create", "edit", "delete", "approve", "export", "download"] },
  { id: "agreements", label: "Agreements", group: "Sales", scoped: true, actions: ["view", "create", "edit", "delete", "approve", "export", "download"] },

  // ── Finance ──────────────────────────────────────────────────────────────
  { id: "invoices",    label: "Invoices",    group: "Finance", scoped: true, actions: ["view", "create", "edit", "delete", "approve", "export", "download"] },
  { id: "receipts",    label: "Receipts",    group: "Finance", scoped: true, actions: ["view", "create", "edit", "delete", "export", "download"] },
  { id: "outstanding", label: "Outstanding", group: "Finance", scoped: true, actions: ["view", "export"] },
  { id: "expenses",    label: "Expenses",    group: "Finance", scoped: true, actions: ["view", "create", "edit", "delete", "export"] },

  // ── Project Management ───────────────────────────────────────────────────
  { id: "projects",         label: "Projects",          group: "Project Management", scoped: true, actions: ["view", "create", "edit", "delete", "assign", "export"] },
  { id: "projectTasks",     label: "Project Tasks",     group: "Project Management", scoped: true, actions: ["view", "create", "edit", "delete", "assign"] },
  { id: "projectDocuments", label: "Project Documents", group: "Project Management", scoped: true, actions: ["view", "upload", "download", "delete"] },

  // ── Documents ────────────────────────────────────────────────────────────
  { id: "documents",   label: "Documents",   group: "Documents", scoped: true, actions: ["view", "upload", "download", "delete", "export"] },
  { id: "attachments", label: "Attachments", group: "Documents", scoped: true, actions: ["view", "upload", "download", "delete"] },

  // ── Reporting ────────────────────────────────────────────────────────────
  { id: "reports",          label: "Reports",          group: "Reporting", scoped: false, actions: ["view", "export"] },
  { id: "salesReports",     label: "Sales Reports",     group: "Reporting", scoped: false, actions: ["view", "export"] },
  { id: "clientReports",    label: "Client Reports",    group: "Reporting", scoped: false, actions: ["view", "export"] },
  { id: "financialReports", label: "Financial Reports", group: "Reporting", scoped: false, actions: ["view", "export"] },
  { id: "activityReports",  label: "Activity Reports",  group: "Reporting", scoped: false, actions: ["view", "export"] },

  // ── Administration ───────────────────────────────────────────────────────
  { id: "users",             label: "Users",              group: "Administration", scoped: false, actions: ["view", "create", "edit", "delete"] },
  { id: "rolesPermissions",  label: "Roles & Permissions", group: "Administration", scoped: false, actions: ["view", "create", "edit", "delete", "assign"] },
  { id: "teams",             label: "Teams",              group: "Administration", scoped: false, actions: ["view", "create", "edit", "delete"] },
  { id: "departments",       label: "Departments",        group: "Administration", scoped: false, actions: ["view", "create", "edit", "delete"] },
  { id: "settings",          label: "Settings",           group: "Administration", scoped: false, actions: ["view", "edit"] },
];

export const PERMISSION_CATALOG_BY_ID: Record<string, PermissionModuleDef> = Object.fromEntries(
  PERMISSION_CATALOG.map((m) => [m.id, m])
);

export function catalogByGroup(): Record<string, PermissionModuleDef[]> {
  const grouped: Record<string, PermissionModuleDef[]> = {};
  for (const group of PERMISSION_GROUPS) grouped[group] = [];
  for (const mod of PERMISSION_CATALOG) grouped[mod.group]?.push(mod);
  return grouped;
}

// Sensitive permissions worth a confirmation before granting (§10, §36).
export const SENSITIVE_ACTIONS: PermissionModuleDef["actions"] = ["delete", "export"];
export const SENSITIVE_MODULE_IDS = ["users", "rolesPermissions", "settings"];
