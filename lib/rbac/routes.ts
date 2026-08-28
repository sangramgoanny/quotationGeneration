import type { PermissionAction } from "@/types/rbac";

export interface RoutePermission { module: string; action: PermissionAction }

const ROUTES: Array<{ prefix: string; permission: RoutePermission }> = [
  { prefix: "/settings/users-access/roles", permission: { module: "roles", action: "view" } },
  { prefix: "/settings/users-access/users", permission: { module: "users", action: "view" } },
  { prefix: "/settings/users-access/teams", permission: { module: "teams", action: "view" } },
  { prefix: "/settings/users-access/departments", permission: { module: "departments", action: "view" } },
  { prefix: "/settings/users-access/activity-logs", permission: { module: "settings", action: "view" } },
  { prefix: "/settings", permission: { module: "settings", action: "view" } },
  { prefix: "/crm/leads", permission: { module: "leads", action: "view" } },
  { prefix: "/crm/pipeline", permission: { module: "leads", action: "view" } },
  { prefix: "/crm/clients", permission: { module: "clients", action: "view" } },
  { prefix: "/quotation", permission: { module: "quotations", action: "view" } },
  { prefix: "/contract", permission: { module: "agreements", action: "view" } },
  { prefix: "/invoice", permission: { module: "invoices", action: "view" } },
  { prefix: "/receipt", permission: { module: "receipts", action: "view" } },
  { prefix: "/projects/tasks", permission: { module: "project_tasks", action: "view" } },
  { prefix: "/projects", permission: { module: "projects", action: "view" } },
  { prefix: "/dashboard", permission: { module: "dashboard", action: "view" } },
];

export function permissionForPath(pathname: string): RoutePermission | null {
  return ROUTES.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.permission ?? null;
}