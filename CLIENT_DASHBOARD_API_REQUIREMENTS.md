# Client Dashboard API Requirements

The current `GET /api/clients` endpoint supports:

- `search`
- `status`
- `stage`
- `industry`
- `accountManagerId`
- `fromDate`
- `toDate`
- `page`
- `limit`

It returns client identity/contact fields, account manager, outstanding balance,
created date, billing city, and quotation/invoice counts.

## Required summary endpoint

`GET /api/reports/client-summary?from=YYYY-MM-DD&to=YYYY-MM-DD`

```json
{
  "period": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "clients": {
    "total": 0,
    "active": 0,
    "inactive": 0,
    "completed": 0,
    "blacklisted": 0,
    "healthy": 0,
    "needsAttention": 0,
    "profileGaps": 0,
    "upsellReady": 0,
    "followUpsDue": 0
  },
  "financials": {
    "totalRevenue": 0,
    "amountReceived": 0,
    "outstandingAmount": 0,
    "overdueAmount": 0,
    "pendingInvoiceAmount": 0,
    "pendingQuotationValue": 0,
    "averageClientValue": 0,
    "collectionRate": 0,
    "currency": "INR"
  },
  "comparison": {
    "totalClientsChange": 0,
    "revenueChange": 0,
    "collectionChange": 0,
    "outstandingChange": 0
  }
}
```

All monetary values should be serialized decimal values or integer minor units;
do not calculate financial totals with floating-point database columns.

## Required client-list extensions

For complete server-side filtering, sorting, and reporting, extend
`GET /api/clients` with:

- `clientType`
- `health`
- `paymentStatus`
- `revenueMin` / `revenueMax`
- `outstandingMin` / `outstandingMax`
- `lastActivityFrom` / `lastActivityTo`
- `followUpDue`
- `profileCompleteness`
- `city`
- `sortBy` / `sortOrder`
- `clientsOnly=true` to exclude leads without client-side filtering

Add these typed fields to each list row:

```json
{
  "revenue": "0.00",
  "amountReceived": "0.00",
  "outstandingBalance": "0.00",
  "lastActivity": {
    "type": "Call Logged",
    "occurredAt": "2026-01-01T10:00:00.000Z"
  },
  "nextFollowUp": {
    "type": "Call",
    "scheduledAt": "2026-01-02T10:00:00.000Z",
    "isOverdue": false
  }
}
```

## Health scoring

The current frontend score is explicitly rule-based and uses lifecycle status
plus profile completeness. A backend score should return `score`, `label`, and
`reasons` if payment behaviour, activity, tasks, invoices, projects, and
follow-up completion are to be included consistently across pagination and
reports.
