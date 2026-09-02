> STATUS: all 8 items below are SORTED / implemented in code.
> Backend repo: `Goannnyerp-backend` · Frontend repo: `quotationGeneration`
> Not yet live — backend needs rebuild + restart, frontend needs redeploy.
> Full write-up: `docs/rbac-quotation-access-spec.md`

---

1. I have created a quotation as a sales manager , but that lead is created by the sales executive. In the sales executive dashboard, this quotation amount is showing in the dashboard (New pipeline this year ), but in the quotation tab & in the leads tab, that particular lead we have created quotations by the sales manager. That quotation did not show. I can't see that quotation in the quotation tab as well as in the lead sections -> view lead sections Sales Executive Login Account , but this lead is created by the sales executive, so the quotation should be visible to the sales executive also Whoever created the quotation would be visible to assigne leads user and I am the team who is assigned to the user with the sales manager. They can see the process of that lift.

   SORTED - quotation visibility is now `createdById` OR `client.accountManagerId` (Sales Exec sees anything they drafted + anything on a lead they own / are assigned; Sales Manager gets the team-wide version).
   - `quotations.service.ts` -> `findAll`, `findOne`, `update`, `remove`, `updateStatus`, `findActivity`, `sendEmail` (via `buildAccessWhereAny` / `assertInScopeAny`)
   - `clients.controller.ts` -> `findQuotations` (the lead-profile quotation list)
   - `dashboard.service.ts` -> `quotations()` now uses the same scope so the dashboard cards match the Quotation tab

2. When we create a quotation and the status of the quotation is changed to "sent", then the automatic lead status changes to "quotation sent". This change must be needed. In a pipeline, this link will be shown in a sign quotation section.

   SORTED - `quotations.service.ts` -> `syncLeadStageForQuotationStatus()` sets parent lead `leadStage = QUOTATION_SENT` on status->SENT (both the manual status change and the auto-mark-SENT-on-email path), logs a "Stage Changed" activity on the lead. One-directional (won't downgrade / won't touch a converted client). Pipeline "Quotation Sent" column then shows the lead automatically.

3. Important part: as a sales executive who has closed the deal, when the quotation is accepted, that means the lead won. When the quotation status is changed to accepted, the live status automatically goes to won. The lead should be visible to the sales executive, the assigned person, because he should know how much he won.

   SORTED - status->ACCEPTED sets parent lead `leadStage = WON` (same helper as #2). Lead stays a LEAD (no auto-convert), so it remains visible to the Sales Executive in the Leads list / pipeline "Won" column. Frontend `leadsApi.convert()` calls on ACCEPTED removed from `LeadQuotationSection` and `QuotationsPage`; lead views refetch on status change.

4. Also, the sales executive and sales managers both can analyze the report itself, so he can check: total leads / how many leads I own / how many leads I lose / what the pipeline is / everything. He can see the reports somewhere in the application.

   SORTED - new `app/reports/page.tsx` (the sidebar "Reports" link was a dead 404). Reads `GET /api/dashboard/summary` (role-scoped server-side): KPIs (Total leads, Won, Lost, Conversion %, Pipeline value), stage breakdown with values, and a per-team-member table for managers. This month / quarter / year / custom range. `/reports` registered in `lib/rbac/routes.ts` under `reports` VIEW (Sales Exec + Manager already hold it).

5. After the lead won, the created quotation status has been accepted. After that, no one can edit the quotation. Any user, anyone from the user role, can't edit that quotation. The edit quotation button should be hidden after the quotation is accepted.

   SORTED -
   - Backend: `quotations.service.update()` throws `409 QUOTATION_LOCKED` when status is ACCEPTED, for every role incl. Super Admin.
   - Frontend: Edit button hidden for accepted quotations in `LeadQuotationSection` and `QuotationsPage`; `openEdit` guard; `/quotation/[id]/edit` shows a "can no longer be edited" notice on direct navigation.

6. In the settings tab, when we are creating a team, add a user search so we can easily search the user and select that.

   SORTED - `components/rbac/TeamForm.tsx` member picker now has a "Search users by name or email" filter, a selected-count, and an empty-state.

7. Every user profile: create a profile section showing user role, assigned team, reporting person, everything.

   SORTED - new read-only `app/profile/page.tsx` (linked from the top-bar avatar): name, email, role, team, department, reporting manager, member-since, status. `auth.service` `me` now returns `reportingManager {name,email}` + `department`; `AuthMe` / `User` types updated.

______________________________________________________________
<!-- new changes -->

8. In the settings tab, there is a counter like admin, super admin. When we click on that counter, the filter will automatically load the list below (by role / status). That is not working, so fix that.

   SORTED - `app/settings/users-access/users/page.tsx`:
   - Root bug: the filter memo had `if (!q) return users;` so the role dropdown (and every filter) was ignored unless search text was typed. Rewritten so search + role dropdown + card filter each apply independently.
   - Stat cards are now clickable filters: Total Users (clears all), Active, Inactive, Admins (Admin + Super Admin). Active card shows an indigo ring; click again to clear.

Sales executive won the deal. Like he closed the client, he client's amount, whatever it is. He in the pipeline, he changing the client to won. And after that there is a button, convert to client. In the CRM, once he is converted to the client, he is visible in the client section. But right now he is not visible to sales executive. This is a problem. If any sales executive closed the deal, he has to view own deals to analyze how much he is earning, like closing the deals on a daily, weekly, monthly basis. So we need to perform target analysis. For that we need that data visible into the sales executive login part. Also we will definitely filter out separately the won leads, closed deals section. But once he is converted as a client, and that leads is related to the sales executive or sales manager or anyone. So he is able to view that lead in their admin panel, their panel.


