# Google Meet Integration — Future Feature Plan

**Status:** Not started. Planned only. To begin implementation, just say "work on the Google Meet integration feature" and point at this file.

## Goal

Let each staff member connect their own Google account (once) so that scheduling a meeting in the ERP creates a real Google Calendar event with a genuine Google Meet link, with that staff member as the organizer — not a shared company mailbox. Invited attendees (clients, colleagues) get a real Google calendar invite automatically.

Company is on **Google Workspace**, which allows the OAuth consent screen to be set to **Internal**, skipping Google's app-verification review entirely.

## Current state (as of research on 2026-08-31)

This is a greenfield feature — none of the scaffolding exists yet:

- **Auth**: plain JWT + bcrypt (`src/auth/auth.service.ts:37-68`). No Passport, no `googleapis`/`google-auth-library` dependency, no OAuth of any kind anywhere in the repo.
- **Email**: nodemailer over Gmail SMTP, one shared mailbox (`src/mail/mail.service.ts:18-56`, sender `accounts@goannyaitech.com`) — not per-user, not reusable for calendar invites.
- **Reminders**: a `Reminder` model already has `type: MEETING` (`prisma/schema.prisma:101-105` enum, model `:369-394`) with `scheduledAt`, `assignedUserId`, `clientId`, `note` — but **no end time, no location/link field, no attendee list**. Lives under `src/clients/reminders/reminders.service.ts` (`create()` at `:354-381`).
- **Settings**: no Integrations/Connected-accounts page or module anywhere (`app/settings/` only has users-access/roles/teams/departments/activity-logs).
- **Frontend**: `MEETING` is already a selectable reminder type in `lib/api/reminders.ts`, mapped to "Meeting" — but no meeting-link field, no calendar view, no OAuth connect UI anywhere.

## Chosen approach: per-user Google OAuth (Calendar API), reusing the existing `Reminder` MEETING type

Not domain-wide delegation (a Workspace admin could alternatively impersonate any user via a single service account with no per-user consent step) — that's a viable future upgrade but needs Workspace Super Admin access. Per-user OAuth works regardless and is the standard, portable approach, so it's the plan here.

---

## Backend changes (`Goannnyerp-backend`)

1. **New dependency:** `npm install googleapis`

2. **Prisma schema** (`prisma/schema.prisma`)
   - New `GoogleAccount` model, 1:1 with `User`: `userId (unique FK)`, `googleEmail`, `accessToken` (encrypted), `refreshToken` (encrypted), `tokenExpiry`, `scope`, `connectedAt`, `updatedAt`.
   - Extend `Reminder` (`:369-394`) with: `endAt DateTime?`, `meetingLink String?`, `googleEventId String?`, `attendeeEmails String[]` (Postgres native array).
   - Real schema migration — needs explicit go-ahead before running against the live Supabase DB (same rule as the receipt-void migration done earlier).

3. **New module `src/integrations/google/`**
   - `google-oauth.service.ts` — builds the OAuth2 client from `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`, generates the consent URL (userId carried in a signed `state` param — must be verified against the authenticated session, never trusted as plain userId), exchanges the callback code for tokens, upserts `GoogleAccount`, and exposes `getAuthorizedClient(userId)` which auto-refreshes an expired access token and persists the new one.
   - `google-calendar.service.ts` — `createMeeting({ organizerUserId, title, description, startAt, endAt, attendeeEmails })` calling `calendar.events.insert` with `conferenceDataVersion: 1` and `conferenceData.createRequest.conferenceSolutionKey.type = 'hangoutsMeet'`; returns `{ eventId, meetLink, htmlLink }`.
   - `google-integrations.controller.ts` — JWT-protected:
     - `GET /integrations/google/connect` → consent URL for the current user
     - `GET /integrations/google/callback` → exchanges `code`, saves tokens, redirects to `${FRONTEND_URL}/settings/integrations?connected=1`
     - `GET /integrations/google/status` → connected? which email?
     - `DELETE /integrations/google/disconnect`
   - Token encryption: Node's built-in `crypto` (AES-256-GCM) keyed by a new `TOKEN_ENCRYPTION_KEY` env var — no extra dependency needed.

4. **Wire into `src/clients/reminders/reminders.service.ts`** (`create()` at `:354-381`)
   - When `type === MEETING` and the creating user has a connected `GoogleAccount`, call the calendar service and store `meetingLink`/`googleEventId` on the row.
   - If the user hasn't connected Google, still create the reminder normally — no link — and flag it in the response so the frontend can nudge "Connect Google Calendar" instead of silently failing.

5. **New env vars** (`.env`): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `TOKEN_ENCRYPTION_KEY`, `FRONTEND_URL`.

6. **Manual, non-code setup** (needs the user's Google Cloud/Workspace access, not something Claude can do): create a Cloud project, enable the **Google Calendar API**, configure the OAuth consent screen as **Internal**, create a Web-application OAuth Client ID, add the redirect URI.

---

## Frontend changes (`quotationGeneration`)

- New `lib/api/integrations.ts` — `googleApi.status()/connect()/disconnect()`, following the existing `request()` pattern used by `lib/api/receipts.ts`.
- New page `app/settings/integrations/page.tsx` (added to the Settings nav) — a "Google Calendar & Meet" card: Connect/Disconnect, shows connected email.
- Extend `LeadReminder` types in `lib/api/reminders.ts` with `endAt`, `meetingLink`, `googleEventId`, `attendeeEmails`.
- Meeting-creation form (exact file to be located during implementation — reminders are created from a modal on the client/lead detail view, not on `app/crm/follow-ups/page.tsx`, which is list-only): when `type === "Meeting"`, show a duration/end-time field (default 30 min), an extra-attendees input, and — if Google isn't connected — a banner linking to Settings > Integrations. After save, show the returned Meet link.
- Show a "Join Meet" button wherever meetings are listed (follow-ups page, client detail reminders list) when `meetingLink` is present.

---

## Verification checklist (once implemented)

1. As a connected test user, create a Meeting-type reminder with an attendee email → confirm a real event appears on that user's actual Google Calendar with a working Meet link, and the attendee receives Google's own calendar-invite email.
2. Force-expire the stored token in DB → confirm the next meeting creation silently refreshes it.
3. Disconnect the account → confirm reminder creation still works, just without a link, and the UI nudges reconnect.
4. Confirm a user *without* a connected account can still use reminders/meetings exactly as today (no regression).
5. Confirm the OAuth `state` param can't be used to hijack another user's connection.
