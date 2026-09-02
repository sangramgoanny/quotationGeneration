# Sales Executive — permission & access audit

> **Status:** F1–F8 are **implemented** (backend + frontend), reseeded
> (`npm run seed:rbac`), typecheck + 65/65 backend tests green. Not yet
> deployed — backend needs rebuild/restart, frontend needs redeploy.
> `Client.createdById` / `Client.closedById` were added to the dev DB via raw
> `ALTER TABLE` + backfill (Prisma `migrate dev` shadow-DB replay is broken on
> this DB); a real migration file still needs to be authored for other envs.

Audit of what the **Sales Executive** role can and cannot do, across both repos.
Companion to `docs/rbac-quotation-access-spec.md`.

- **Backend = source of truth:** `Goannnyerp-backend` (NestJS). `PermissionsGuard`
  enforces `@RequirePermission(module, action)` against the role's grant map. A
  route with **no** decorator is allowed for any authenticated user.
- **Frontend = presentation only:** this repo — `lib/rbac/roleAccess.ts`,
  `lib/rbac/routes.ts`, `components/Sidebar.js`, `components/rbac/ProtectedRoute.tsx`.
  These hide UI; they never enforce.
- Role code is `SALES_EXECUTIVE` (`prisma/seed-rbac.ts` sets `code = meta.name`).
  `roleAccess.ts` keys on that exact string, so a seeded Sales Executive matches.

---

## 1. Backend grant map

From `src/rbac/default-permissions.ts`, `SALES_EXECUTIVE` block (`leads` mirrors
`clients`, applied at the end of `buildRolePermissions`):

| Module | Scope | Actions |
|---|---|---|
| `leads`, `clients`, `contacts` | OWN | VIEW, CREATE, EDIT |
| `activities` | OWN | VIEW, CREATE |
| `followups`, `tasks`, `quotations` | OWN | VIEW, CREATE, EDIT |
| `agreements` | OWN | VIEW, CREATE |
| `projects`, `project_tasks` | OWN | VIEW, EDIT |
| `documents` | OWN | VIEW, UPLOAD, DOWNLOAD |
| `reports`, `dashboard` | OWN | VIEW |
| `invoices`, `receipts`, `outstanding` | **NONE** | — |
| `users`, `roles`, `teams`, `departments`, `settings` | **NONE** | — |

**Scope semantics in effect:**
- OWN generally = the parent lead/client's `accountManagerId` is the caller.
- Quotations also match `createdById` (drafted it) — `buildAccessWhereAny` on
  `['createdById', 'client.accountManagerId']`.
- Follow-ups match `createdById` **OR** `assignedUserId` (`buildAccessWhereAny`
  on the `followups` module).
- No `ASSIGN` / `REASSIGN` anywhere → `GET /api/users?assignableTo=leads` 403s
  (frontend already skips the call for this role).

## 2. Frontend hiding (`lib/rbac/roleAccess.ts`)

| Kind | Values for `SALES_EXECUTIVE` |
|---|---|
| `ROLE_DENIED_MODULES` | `clients`, `invoices`, `receipts`, `outstanding` |
| `ROLE_DENIED_NAV_LABELS` | Clients, Finance, Expenses, Invoices, Receipts |
| `ROLE_DENIED_PATH_PREFIXES` | `/crm/clients`, `/invoice`, `/receipt`, `/finance` |

**Net sidebar a Sales Executive sees:** Dashboard, AI Center\*, Reports, Pipeline,
Leads, Activities, Follow Ups, Quotations, Proposals\*, Deals\*, Agreements,
Projects, Tasks. **Hidden:** Clients, the whole Finance group, Settings.
(\* no `moduleId` and no backing page — pre-existing dead links, visible to all roles.)

## 3. Verified correct

- **Quotation visibility** — `createdById` OR `client.accountManagerId` across
  `quotations.service` (`findAll`, `findOne`, `update`, `remove`, `updateStatus`,
  `findActivity`, `sendEmail`), `clients.controller.findQuotations`, and
  `dashboard.service.quotations()`. A Sales Executive sees quotations they drafted
  **and** any quotation on a lead they own/are assigned, even one a Sales Manager
  created.
- **Follow-ups** — scoped by involvement (`createdById` OR `assignedUserId`) on
  list / summary / calendar / get / update / delete. Owning the parent lead is
  not sufficient.
- **Finance** (`invoices`, `receipts`, `outstanding`) — scope NONE **and** the
  controllers carry `@RequirePermission`, so `PermissionsGuard` returns 403.
- **Admin area** (`settings`, `users`, `roles`, `teams`, `departments`) — NONE +
  guarded. `/settings` also blocked by `ProtectedRoute` via `routes.ts`.
- **Reports** — `reports` VIEW OWN; `/reports` registered in `routes.ts`; the new
  `app/reports/page.tsx` reads the role-scoped `GET /api/dashboard/summary`.
- **Accepted-quotation lock** — `quotations.service.update()` throws
  `409 QUOTATION_LOCKED` for every role, and the Edit button is hidden.

## 4. Findings & agreed remediation (NOT YET APPLIED)

### F1 — `expenses` API is unguarded  *(functional gap — agreed: fix)*

`src/expenses/expenses.controller.ts` has **no `@RequirePermission`**, and there
is no `expenses` key in `PHASE1_MODULE_KEYS` / `MODULE_CATALOG`. Because
`PermissionsGuard` allows any route without the decorator, **any authenticated
user — Sales Executive included — can call `GET/POST/PATCH/DELETE /api/expenses`.**
The frontend only hides the "Expenses" nav item and the `/finance` route prefix,
so it is UI-hidden but API-open. This contradicts "no finance access past the
quotation stage."

**Agreed remediation — add an `expenses` permission module:**
- `src/rbac/rbac.types.ts` — add `'expenses'` to `PHASE1_MODULE_KEYS`.
- `src/rbac/default-permissions.ts` — add to `MODULE_CATALOG`; in
  `buildRolePermissions` grant `ALL` for SUPER_ADMIN / ADMIN / ACCOUNTS_USER,
  `TEAM` view for SALES_MANAGER, **`NONE`** for SALES_EXECUTIVE / ACCOUNT_MANAGER
  (and VIEWER unless a read is wanted).
- `src/expenses/expenses.controller.ts` — `@RequirePermission('expenses', …)` on
  each method (VIEW / CREATE / EDIT / DELETE).
- Frontend — add `expenses` to `PERMISSION_CATALOG` (`lib/rbac/catalog.ts`);
  point the Sidebar "Expenses" item at `moduleId: "expenses"`; add
  `{ prefix: "/finance/expenses", permission: { module: "expenses", action: "view" } }`
  to `lib/rbac/routes.ts`.
- Run `npm run seed:rbac`.

### F2 — Agreements: read-only, and only for clients the Sales Executive closed  *(revised)*

Backend currently grants `agreements` OWN VIEW + CREATE; `roleAccess.ts` does not
hide it and `/contract` is not blocked, so a Sales Executive can open the
Agreements module and create agreements.

**Revised policy** (supersedes the earlier "hide entirely"): a Sales Executive
may **view** agreements — but only those whose parent client they **closed**
(`Client.closedById === me`, the new column from F7). No create / edit / delete.
And when a Sales Executive opens one of those clients, the client page shows a
**reduced view** — client name, company name, that client's quotations, and its
agreements — not the full CRM record (billing / bank / GST / tax / balances /
internal notes / etc.).

**Agreed remediation (depends on F6 + F7):**
- Backend `src/rbac/default-permissions.ts` `SALES_EXECUTIVE` block — change
  `agreements` from `own(['VIEW', 'CREATE'])` to **`own(['VIEW'])`** (view only).
- Backend `src/agreements/agreements.service.ts` — widen the list/read scope for
  the `agreements` module from `createdById` to
  `buildAccessWhereAny(auth, 'agreements', ['createdById', 'client.closedById'], permissions)`,
  and the single-record checks to
  `assertInScopeAny([agreement.createdById, agreement.client.closedById])`.
  `Agreement.clientId` already exists; `buildAccessWhereAny` / `assertInScopeAny`
  already exist in `src/rbac/rbac.service.ts`.
- Backend `agreements.controller.ts` — reads keep
  `@RequirePermission('agreements', 'VIEW')`; the CREATE / EDIT / DELETE
  endpoints already require actions the Sales Executive will not hold, so they
  403 automatically.
- Frontend `lib/rbac/roleAccess.ts` — do **not** add `agreements` /
  `"Agreements"` / `"/contract"` to the deny lists (the earlier "hide" plan is
  dropped).
- Frontend `components/clients/ClientProfile.tsx` — when the current role is
  `SALES_EXECUTIVE`, render the reduced client view described above: name,
  company name, the Quotations panel, and an Agreements panel only; hide billing
  address, bank details, GST / PAN / TAN, tax settings,
  credit / opening / outstanding balances, internal / meeting notes, and the
  finance actions.
- Reseed (`npm run seed:rbac`).

### F3 — Projects / Tasks are visible to a Sales Executive  *(agreed: hide)*

Backend grants `projects` and `project_tasks` OWN VIEW + EDIT; the sidebar shows
both and `/projects*` is not blocked.

**Agreed remediation:**
- Backend `SALES_EXECUTIVE` block — set `projects` and `project_tasks` to `NONE`.
- `lib/rbac/roleAccess.ts` — add `"projects"`, `"projectTasks"` to
  `ROLE_DENIED_MODULES`; `"Projects"`, `"Tasks"` to `ROLE_DENIED_NAV_LABELS`;
  `"/projects"` to `ROLE_DENIED_PATH_PREFIXES`.
- Reseed.

### F4 — `projectTasks` module-key mismatch  *(pre-existing, affects all roles)*

The backend serializes the key as `project_tasks`; the sidebar item and
`lib/rbac/routes.ts` use `projectTasks`; `AuthRbacProvider` only aliases
`followups → followUps`. So `canView("projectTasks")` is `false` for **everyone**
today and the Tasks nav entry / `/projects/tasks` guard never pass. If F3 hides
Tasks for the Sales Executive this is moot for them, but for other roles add
`project_tasks: "projectTasks"` to `BACKEND_MODULE_ALIASES` in
`lib/rbac/AuthRbacProvider.tsx`.

### F5 — Legacy users (`roleId` null) skip the frontend denials  *(latent)*

`rbac.service.getUserPermissions` falls back to `legacyFallbackMap(user.role)`
when a user has no `roleId` / `userAccess.role`, and `GET /api/auth/me` then
returns `assignedRole: null`. `roleAccess.ts` receives `roleCode ?? null`, so
**no** Sales-Exec UI hiding is applied for such a user — even though their backend
grants are Sales-Exec-equivalent. All 11 current users have `user_access` rows,
so this is latent, not active.

**Fix later:** in `ConditionalLayout.tsx` / `Sidebar.js`, derive the role code
from `currentUser.role` (`STAFF → SALES_EXECUTIVE`, `MANAGER → SALES_MANAGER`,
`ADMIN → ADMIN`) when `assignedRole` is null; or backfill `roleId` on every user.

---

## 5. Client-visibility policy (target) & gap analysis

### Target matrix

| Role | Client visibility |
|---|---|
| Admin | All clients |
| Sales Manager | Clients belonging to the manager and their team |
| Sales Executive | Clients created from leads assigned to them, created by them, or closed by them |
| Other Users | Only explicitly permitted or assigned clients |

### How client scope works today

`src/clients/clients.service.ts` builds the list filter with
`buildAccessWhere(auth, 'clients' | 'leads', 'accountManagerId', permissions)`
(≈ lines 165 and 280); the eight single-record checks use
`assertInScope(auth, 'clients', client.accountManagerId, …)` (≈ 473, 540, 663,
707, 791, 823, 865, 904). The `Client` model has **only `accountManagerId`** —
no `createdById`, no `closedById`. `convertLead` (≈ line 807) sets
`status = ACTIVE, leadStage = WON` and leaves `accountManagerId` untouched, so a
converted client keeps the lead's account manager.

| Role | Backend scope today | vs target |
|---|---|---|
| Admin / Super Admin | `clients` **ALL** → no filter | ✅ matches |
| Sales Manager | `clients` **TEAM** → `accountManagerId IN teamMemberIds` (`getTeamMemberIds` = everyone with the same `teamId`, incl. self; `[userId]` if no team) | ✅ matches "manager and their team" |
| Sales Executive | `clients` **OWN** → `accountManagerId IN [me]`, **and the frontend hides the whole module** | ⚠️ two gaps → F6, F7 |
| Account Manager | `clients` **OWN** → `accountManagerId IN [me]` | ✅ ("assigned") |
| Accounts User / Viewer | `clients` **ALL**, view-only | acceptable as "explicitly permitted" |

### F6 — Un-hide Clients for Sales Executive (scoped view)  *(agreed)*

Today `roleAccess.ts` hides the module entirely, so the target row for Sales
Executive can never be met in the UI.

**Agreed remediation:**
- `lib/rbac/roleAccess.ts` — under `SALES_EXECUTIVE`, remove `"clients"` from
  `ROLE_DENIED_MODULES`, `"Clients"` from `ROLE_DENIED_NAV_LABELS`, and
  `"/crm/clients"` from `ROLE_DENIED_PATH_PREFIXES`.
- No change to the grant itself — `clients` stays OWN VIEW/CREATE/EDIT, and
  `/crm/clients` is already in `routes.ts` (`clients` view), so `ProtectedRoute`
  admits it once `roleAccess.ts` stops blocking.
- Consequence: the Sales Executive also gets the client detail page. Per **F2**
  that page is a **reduced view** for this role — client name, company name, the
  Quotations panel, and the Agreements panel only — not the full CRM record.
  The underlying contacts / notes / documents / activities / reminders remain
  `clients` / `contacts` / …-scoped, so no extra grants are needed.

### F7 — Model "created by" / "closed by" for clients  *(agreed — add DB columns)*

"created by them" and "closed by them" are not representable today (`Client` only
has `accountManagerId`). In practice a lead's creator becomes its account manager
by default (`accountManagerId = dto.accountManagerId ?? auth.id`), so the gap
only bites when a lead is reassigned or a different user accepts the winning
quotation.

**Agreed remediation:**
- **Schema** (`prisma/schema.prisma`) — add to `Client`:
  `createdById String? @map("created_by_id")` + `createdBy User? @relation("ClientCreatedBy", …)`,
  and `closedById String? @map("closed_by_id")` + `closedBy User? @relation("ClientClosedBy", …)`,
  with an index on each; add the inverse relations on `User`. Prisma migration.
- **Backfill** — `createdById` ← `accountManagerId` for existing rows;
  `closedById` ← the `createdById` of that client's `ACCEPTED` quotation where
  one exists, else null.
- **Populate going forward** —
  - `createdById`: `auth.id` in the client / lead create path in
    `clients.service` (next to `accountManagerId = dto.accountManagerId ?? auth.id`).
  - `closedById`: `auth.id` in
    `quotations.service.syncLeadStageForQuotationStatus()` when the target stage
    is `WON`, and in `convertLead`.
- **Scope predicate** — for the `clients` (and, for consistency, `leads`) module,
  swap `buildAccessWhere(… 'accountManagerId' …)` →
  `buildAccessWhereAny(… ['accountManagerId', 'createdById', 'closedById'] …)`
  in `clients.service` list scope and the `clients.controller` reads; swap
  `assertInScope` → `assertInScopeAny([client.accountManagerId,
  client.createdById, client.closedById])` at the eight single-record checks.
  `buildAccessWhereAny` / `assertInScopeAny` already exist in
  `src/rbac/rbac.service.ts` (added for quotations / follow-ups).
- **Dashboard** — `dashboard.service.pipeline()` uses
  `buildAccessWhere(auth, 'leads', 'accountManagerId')`; widen it the same way so
  the dashboard lead/pipeline figures match the Leads and Clients lists (mirrors
  the `dashboard.service.quotations()` fix already shipped).
- `SALES_MANAGER` (TEAM) and `ADMIN` (ALL) are unaffected by the widening.
- Record the new OWN semantics for `clients` / `leads` in
  `docs/rbac-quotation-access-spec.md` and the `default-permissions.ts` comment.

---

## Follow-up

F1, F3, F6 are backend grant / deny-list edits plus a role reseed
(`npm run seed:rbac`); F4/F5 are one-liners. **F2** is now a grant change
(`agreements` → view-only) + an agreements-scope swap in
`src/agreements/agreements.service.ts` + a reduced-view branch in
`components/clients/ClientProfile.tsx`, and it **depends on F6 + F7**. F7 is a
Prisma migration + backfill plus a scope-predicate swap across `clients.service`,
`clients.controller`, `quotations.service`, and `dashboard.service`. All to be
done as a separate, approved implementation pass — recommended order: F7 → F6 → F2.
