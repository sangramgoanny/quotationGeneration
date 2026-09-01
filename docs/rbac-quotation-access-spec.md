# RBAC — Quotation access & finance boundary for Sales roles

Status: **implemented** (frontend in this repo + backend `Goannnyerp-backend`).
The frontend only hides UI (`lib/rbac/*`, `components/*`); the rules below are
enforced by the NestJS API that `app/api/**/route.ts` proxies to (`BACKEND_URL`).
`GET /api/auth/me` is authoritative for a user's role and effective permissions.

## Implementation status

| Requirement | Status | Where |
|---|---|---|
| 1 — Sales Exec sees quotations they drafted **or** that sit on a lead they own/are assigned | ✅ done | `quotations.service.ts` (`findAll`, `findOne`, `update`, `remove`, `updateStatus`, `findActivity`, `sendEmail`) + `clients.controller.ts` `findQuotations` scope via `buildAccessWhereAny` / `assertInScopeAny` on **`createdById` OR `client.accountManagerId`**. `create` still requires the caller to own the target lead. |
| 2 — Admin / Super Admin / Sales Manager access | ✅ already correct | `SUPER_ADMIN`/`ADMIN` = `ALL`; `SALES_MANAGER` = `TEAM` (now covers quotations on any team member's lead via the same change). No seed change needed. |
| 3 — Sales Exec has no invoice/receipt/outstanding access | ✅ already enforced | `SALES_EXECUTIVE` seed grants `NONE` for `invoices`/`receipts`/`outstanding`; `invoices`/`receipts` controllers carry `@RequirePermission`, and `PermissionsGuard` 403s on `scope: NONE`. |
| 3 (follow-up) — `expenses` module | ⚠️ open | `src/expenses/expenses.controller.ts` has **no** `@RequirePermission` and there is no `expenses` permission-module key, so it's open to any authenticated user. Needs a catalog key + guard if expenses must be Sales-Exec-restricted. |
| 4 — Follow-ups scoped to the user, not the lead | ✅ done | `reminders.service.ts` now scopes by involvement (`createdById` OR `assignedUserId`) under the `followups` module key, via new `RbacService.buildAccessWhereAny` / `assertInScopeAny`. Previously it scoped by `client.accountManagerId`, so a Sales Executive saw every follow-up sitting on one of their leads even if a colleague/manager created or owned it. |

## Follow-ups (reminders) visibility

A follow-up is "yours" when **you created it or it is assigned to you** — owning
the parent lead/client is not enough. Enforced in `reminders.service.ts` on the
global list (`GET /api/reminders`), `summary`, `calendar`, `GET /api/reminders/:id`,
per-client list (`GET /api/clients/:id/reminders`), and every update/delete path.

| Scope (`followups`) | Sees |
|---|---|
| `OWN` (Sales Executive) | follow-ups where `createdById = me` OR `assignedUserId = me` |
| `TEAM` (Sales Manager) | follow-ups created by / assigned to any team member |
| `ALL` (Admin, Super Admin) | all follow-ups |

`activities` already scope this way (by `userId`, the actor). `tasks` and
`projects` still scope by lead/project ownership — revisit if the same
"only what I'm involved in" rule should apply there.

The rest of this doc is the original design rationale.

## Roles in scope

| Role code (backend) | Frontend label | Expected quotation access |
|---|---|---|
| `SUPER_ADMIN` | Super Admin | All quotations, all records. |
| `ADMIN` | Admin | All quotations (`quotations.scope = ALL`). |
| `SALES_MANAGER` / `MANAGER` | Sales Manager / Manager | All quotations for their team (`quotations.scope = TEAM`), including quotations on any lead owned by a team member. |
| `SALES_EXECUTIVE` / `STAFF` | Sales Executive / Staff | Every quotation attached to a lead they **created or are assigned to** — regardless of who created the quotation. No finance access past the quotation. |

> "Sub Admin" is out of scope for now — no such role exists in the system.

## Requirement 1 — Sales Executive sees *all* quotations on their lead

**Rule:** a `SALES_EXECUTIVE` may read a quotation if the parent lead/client's
`ownerId`/`accountManagerId` (or an entry in the lead's assignee set) equals the
requesting user — **not** only when `quotation.createdById === user.id`.

This is the meaning `OWN` scope must carry for the `quotations` module. The
frontend seed in `lib/rbac/defaultRoles.ts` now documents this expectation.

Endpoints that must apply the lead-ownership check (not creator-only):

- `GET /api/quotations?clientId=<leadId>` — list used by the main Quotations page.
- `GET /api/clients/:id/quotations` — list rendered in
  `components/leads/LeadQuotationSection.tsx` (lead profile + leads page).
- `GET /api/quotations/:id` and `GET /api/quotations/:id/activity` — detail / activity.
- `POST /api/quotations`, `PATCH /api/quotations/:id`,
  `PATCH /api/quotations/:id/status`, `POST /api/quotations/:id/email`,
  `DELETE /api/quotations/:id` — write paths use the same ownership predicate
  (delete/status may be further restricted, but never *broader* than read).

**Ownership predicate (reference — as implemented):**

```
canAccessQuotation(user, quotation):
  scope = permissions[user]["quotations"].scope
  if scope == "ALL":   return true          # SUPER_ADMIN, ADMIN
  if scope == "NONE":  return false
  ids = scope == "TEAM" ? teamMemberIds(user) : [user.id]
  # in scope when the caller (or their team) drafted it OR owns the lead
  return quotation.createdById in ids
      or quotation.client.accountManagerId in ids
```

Apply the same predicate as a row filter on every list endpoint above, and as a
403 guard on every by-id endpoint.

## Requirement 2 — Admin / Super Admin / Sales Manager

No behavioural change beyond Requirement 1's predicate. Confirm:

- `ADMIN` / `SUPER_ADMIN` — `quotations.scope = ALL`, plus full finance access
  (invoices, receipts, outstanding) unchanged.
- `SALES_MANAGER` — `quotations.scope = TEAM`; may view/edit/approve quotations
  on any team member's lead. No finance mutation (matches the current seed:
  no `invoices` / `receipts` / `outstanding` grant).

## Requirement 3 — Sales Executive has no finance access past the quotation

For `SALES_EXECUTIVE` / `STAFF`, the API must return `403` (and `/api/auth/me`
must report `scope: NONE`) for every module downstream of the quotation:

| Module | Endpoints to deny |
|---|---|
| `invoices` | `GET/POST/PATCH/DELETE /api/invoices*`, `/api/clients/:id/invoices` |
| `receipts` (payments) | `GET/POST/PATCH/DELETE /api/receipts*`, `/api/clients/:id/receipts` |
| `outstanding` | `GET /api/outstanding*`, outstanding summaries |
| `financialReports` | `GET /api/reports/financial*` |
| `clients` (full CRM client area) | already `OWN`/restricted — keep |

Accepting a quotation may still trigger lead → client conversion server-side, but
the Sales Executive must not be able to open, create, or list any invoice /
receipt / payment that results.

### Frontend hooks already in place (for reference)

- `lib/rbac/roleAccess.ts` hides, for `SALES_EXECUTIVE`: the `clients`,
  `invoices`, `receipts`, `outstanding` modules; the `Clients` / `Finance` /
  `Expenses` / `Invoices` / `Receipts` nav; and the `/crm/clients`, `/invoice`,
  `/receipt`, `/finance` routes (guarded in `components/ConditionalLayout.tsx`,
  `components/Sidebar.js`).
- The "Create Invoice" hand-off is now gated on `canView("invoices")` in
  `components/leads/LeadQuotationSection.tsx` and
  `components/quotations/QuotationsPage.tsx`.

These are cosmetic — a Sales Executive can still hand-craft the request, so the
API guard is the real boundary.

## Test matrix

| Actor | Lead owner | Quotation creator | Expect |
|---|---|---|---|
| Sales Exec A | Sales Exec A | Sales Exec A | ✅ read/edit |
| Sales Exec A | Sales Exec A | Sales Manager | ✅ read (was ❌ under creator-only) |
| Sales Exec A | Sales Exec A | Admin | ✅ read |
| Sales Exec A | Sales Exec B | Sales Exec A | ❌ 403 |
| Sales Exec A | Sales Exec B | Sales Exec B | ❌ 403 |
| Sales Manager | team member | anyone | ✅ read/edit/approve |
| Sales Manager | non-team | anyone | ❌ 403 |
| Admin / Super Admin | anyone | anyone | ✅ |
| Sales Exec A | Sales Exec A | — | ❌ 403 on `POST /api/invoices`, `GET /api/invoices`, `GET /api/receipts`, `GET /api/outstanding` |
