import type { AccessScope, ModulePermission, PermissionAction, Role } from "@/types/rbac";
import { PERMISSION_CATALOG } from "@/lib/rbac/catalog";
import { emptyModulePermission, sanitizeToModule } from "@/lib/rbac/permissions";

type GrantSpec = Record<string, { scope: AccessScope; actions?: PermissionAction[] }>;

function buildPermissions(spec: GrantSpec): ModulePermission[] {
  return PERMISSION_CATALOG.map((mod) => {
    const grant = spec[mod.id];
    if (!grant) return emptyModulePermission(mod.id, "NONE");
    const mp = emptyModulePermission(mod.id, grant.scope);
    for (const action of grant.actions ?? []) {
      if (action !== "view" && mod.actions.includes(action)) mp[action] = true;
    }
    return sanitizeToModule(mp, mod.id);
  });
}

function fullAccessPermissions(): ModulePermission[] {
  return PERMISSION_CATALOG.map((mod) =>
    sanitizeToModule(
      {
        ...emptyModulePermission(mod.id, "ALL"),
        create: true, edit: true, delete: true, assign: true, reassign: true,
        export: true, approve: true, upload: true, download: true,
      },
      mod.id
    )
  );
}

const ALL: AccessScope = "ALL";
const TEAM: AccessScope = "TEAM";
const OWN: AccessScope = "OWN";

export interface SeedRole {
  code: string;
  name: string;
  description: string;
  department?: string;
  type: "SYSTEM";
  permissions: ModulePermission[];
}

const ROLE_PERMISSION_TEMPLATES: SeedRole[] = [
  {
    code: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Full access to every module, every record, and system administration. Cannot be edited by lower-level users.",
    type: "SYSTEM",
    permissions: fullAccessPermissions(),
  },
  {
    code: "ADMIN",
    name: "Admin",
    description: "Manages leads, clients, sales, finance, projects, documents, reports, and users. Sensitive system settings are restricted.",
    type: "SYSTEM",
    permissions: buildPermissions({
      dashboard: { scope: ALL, actions: ["view"] },
      leads: { scope: ALL, actions: ["view", "create", "edit", "delete", "assign", "reassign", "export"] },
      clients: { scope: ALL, actions: ["view", "create", "edit", "delete", "assign", "export"] },
      contacts: { scope: ALL, actions: ["view", "create", "edit", "delete"] },
      activities: { scope: ALL, actions: ["view", "create", "edit", "delete", "assign"] },
      followUps: { scope: ALL, actions: ["view", "create", "edit", "delete", "assign"] },
      tasks: { scope: ALL, actions: ["view", "create", "edit", "delete", "assign"] },
      quotations: { scope: ALL, actions: ["view", "create", "edit", "delete", "approve", "export", "download"] },
      agreements: { scope: ALL, actions: ["view", "create", "edit", "delete", "approve", "export", "download"] },
      invoices: { scope: ALL, actions: ["view", "create", "edit", "delete", "approve", "export", "download"] },
      receipts: { scope: ALL, actions: ["view", "create", "edit", "delete", "export", "download"] },
      outstanding: { scope: ALL, actions: ["view", "export"] },
      projects: { scope: ALL, actions: ["view", "create", "edit", "delete", "assign", "export"] },
      projectTasks: { scope: ALL, actions: ["view", "create", "edit", "delete", "assign"] },
      projectDocuments: { scope: ALL, actions: ["view", "upload", "download", "delete"] },
      documents: { scope: ALL, actions: ["view", "upload", "download", "delete", "export"] },
      attachments: { scope: ALL, actions: ["view", "upload", "download", "delete"] },
      reports: { scope: ALL, actions: ["view", "export"] },
      salesReports: { scope: ALL, actions: ["view", "export"] },
      clientReports: { scope: ALL, actions: ["view", "export"] },
      financialReports: { scope: ALL, actions: ["view", "export"] },
      activityReports: { scope: ALL, actions: ["view", "export"] },
      users: { scope: ALL, actions: ["view", "create", "edit", "delete"] },
      rolesPermissions: { scope: ALL, actions: ["view", "create", "edit", "assign"] },
      teams: { scope: ALL, actions: ["view", "create", "edit", "delete"] },
      departments: { scope: ALL, actions: ["view", "create", "edit", "delete"] },
      settings: { scope: ALL, actions: ["view"] },
    }),
  },
  {
    code: "SALES_MANAGER",
    name: "Sales Manager",
    description: "Oversees team leads, clients, activities, and follow-ups. Runs quotations and sales reporting for the team. Cannot manage system settings or financial transactions.",
    department: "Sales",
    type: "SYSTEM",
    permissions: buildPermissions({
      dashboard: { scope: ALL, actions: ["view"] },
      leads: { scope: TEAM, actions: ["view", "create", "edit", "assign", "reassign", "export"] },
      clients: { scope: TEAM, actions: ["view", "create", "edit", "assign", "export"] },
      contacts: { scope: TEAM, actions: ["view", "create", "edit"] },
      activities: { scope: TEAM, actions: ["view", "create", "edit", "assign"] },
      followUps: { scope: TEAM, actions: ["view", "create", "edit", "assign"] },
      tasks: { scope: TEAM, actions: ["view", "create", "edit", "assign"] },
      quotations: { scope: TEAM, actions: ["view", "create", "edit", "approve", "export", "download"] },
      reports: { scope: ALL, actions: ["view"] },
      salesReports: { scope: ALL, actions: ["view", "export"] },
      teams: { scope: ALL, actions: ["view"] },
    }),
  },
  {
    code: "SALES_EXECUTIVE",
    name: "Sales Executive",
    description: "Handles assigned leads, follow-ups, activities, and sales opportunities of their own.",
    department: "Sales",
    type: "SYSTEM",
    permissions: buildPermissions({
      dashboard: { scope: ALL, actions: ["view"] },
      leads: { scope: OWN, actions: ["view", "create", "edit"] },
      // Read-only in the Clients area — see docs/rbac-sales-executive-audit.md.
      // The frontend gates every mutating control on can("clients", "edit").
      clients: { scope: OWN, actions: ["view"] },
      contacts: { scope: OWN, actions: ["view", "create", "edit"] },
      activities: { scope: OWN, actions: ["view", "create", "edit"] },
      followUps: { scope: OWN, actions: ["view", "create", "edit"] },
      tasks: { scope: OWN, actions: ["view", "create", "edit"] },
      // OWN here must mean "quotations belonging to a lead/client this user
      // owns or is assigned", not only quotations they personally created —
      // see docs/rbac-quotation-access-spec.md. No finance grants past this
      // stage (invoices/receipts/outstanding stay NONE).
      quotations: { scope: OWN, actions: ["view", "create", "edit"] },
    }),
  },
  {
    code: "ACCOUNT_MANAGER",
    name: "Account Manager",
    description: "Manages client relationships after lead conversion — assigned clients, contacts, activities, follow-ups, projects, agreements, and documents.",
    department: "Sales",
    type: "SYSTEM",
    permissions: buildPermissions({
      dashboard: { scope: ALL, actions: ["view"] },
      clients: { scope: OWN, actions: ["view", "edit"] },
      contacts: { scope: OWN, actions: ["view", "create", "edit"] },
      activities: { scope: OWN, actions: ["view", "create", "edit"] },
      followUps: { scope: OWN, actions: ["view", "create", "edit"] },
      agreements: { scope: OWN, actions: ["view", "create", "edit", "download"] },
      projects: { scope: OWN, actions: ["view", "edit"] },
      projectTasks: { scope: OWN, actions: ["view", "edit"] },
      projectDocuments: { scope: OWN, actions: ["view", "upload", "download"] },
      documents: { scope: OWN, actions: ["view", "upload", "download"] },
      attachments: { scope: OWN, actions: ["view", "upload", "download"] },
    }),
  },
  {
    code: "ACCOUNTS_USER",
    name: "Accounts User",
    description: "Handles client billing, invoices, receipts, outstanding balances, payment follow-ups, and financial reporting. General sales pipeline access is restricted.",
    department: "Accounts",
    type: "SYSTEM",
    permissions: buildPermissions({
      dashboard: { scope: ALL, actions: ["view"] },
      clients: { scope: ALL, actions: ["view"] },
      followUps: { scope: ALL, actions: ["view", "create", "edit"] },
      invoices: { scope: ALL, actions: ["view", "create", "edit", "approve", "export", "download"] },
      receipts: { scope: ALL, actions: ["view", "create", "edit", "export", "download"] },
      outstanding: { scope: ALL, actions: ["view", "export"] },
      financialReports: { scope: ALL, actions: ["view", "export"] },
    }),
  },
  {
    code: "VIEWER",
    name: "Viewer",
    description: "Read-only access to selected modules. Cannot create, edit, delete, assign, or export unless explicitly granted.",
    type: "SYSTEM",
    permissions: buildPermissions({
      dashboard: { scope: ALL, actions: ["view"] },
      leads: { scope: ALL, actions: [] },
      clients: { scope: ALL, actions: [] },
      quotations: { scope: ALL, actions: [] },
      agreements: { scope: ALL, actions: [] },
      invoices: { scope: ALL, actions: [] },
      receipts: { scope: ALL, actions: [] },
      projects: { scope: ALL, actions: [] },
      documents: { scope: ALL, actions: [] },
      reports: { scope: ALL, actions: [] },
    }),
  },
];

// The backend user API is authoritative for role codes. Keep the richer
// permission templates, but expose only roles that a backend User can hold.
export const DEFAULT_ROLES: SeedRole[] = [
  { ...ROLE_PERMISSION_TEMPLATES.find((role) => role.code === "ADMIN")!, code: "ADMIN", name: "Admin" },
  { ...ROLE_PERMISSION_TEMPLATES.find((role) => role.code === "SALES_MANAGER")!, code: "MANAGER", name: "Manager" },
  { ...ROLE_PERMISSION_TEMPLATES.find((role) => role.code === "SALES_EXECUTIVE")!, code: "STAFF", name: "Staff" },
];

export function seedRoleRecord(seed: SeedRole, now: string): Role {
  return {
    id: crypto.randomUUID(),
    name: seed.name,
    code: seed.code,
    description: seed.description,
    department: seed.department,
    type: seed.type,
    status: "ACTIVE",
    permissions: seed.permissions,
    createdAt: now,
    updatedAt: now,
  };
}
