---
title: Sheets-backed Booking Assistant
---
# Sheets-backed Booking Assistant

## What & Why
Add a "ChatWit" booking mode where each project can be linked to a Google Sheet that acts as both the live booking database and the admin control panel. The chat assistant reads/writes to the sheet on every turn, so admins can change behavior or update availability without any restart or code change.

## Done looks like
- An admin can paste a Google Sheet ID into a project's settings (after sharing the sheet with our service account email) and the project switches into "ChatWit booking" mode.
- The linked sheet has two tabs: `Availability` (Date, Time, Location, Name, Phone, Status, CreatedAt) and `Settings` (Key/Value rows the admin edits freely).
- When a user types "I want a 3 PM slot tomorrow in Mumbai", the assistant:
  - Extracts date/time/location.
  - Reads the sheet live (no cache) and finds the matching slot.
  - If the slot is `Available`, it books it (writes the row to `Booked`, fills in name) and replies with the admin's confirmation template.
  - If the slot is `Booked`, it does NOT overwrite, and replies with the admin's "already booked" template plus the next free alternatives.
  - If no row exists yet for that slot, it creates a new `Booked` row.
- Admin edits to the `Settings` sheet (system prompt, response templates, business hours, slot duration) take effect on the very next chat message.
- Two users trying to book the same slot at the same time cannot both succeed — the second one gets the "already booked" response.
- The assistant degrades gracefully when the sheet is unreachable or misconfigured (clear error message instead of a crash).

## Out of scope
- Excel / OneDrive / Microsoft Graph (v2)
- Per-user Google OAuth (v1 uses one shared service account; admins share their sheet with that service-account email)
- Email/SMS confirmations to the booked person
- Calendar (Google Calendar / Outlook) sync
- Recurring slots, multi-day ranges, time-zone selection per project (assume one configured TZ)
- Editing the sheet schema from the chat UI (admins edit columns/headers themselves)

## Steps
1. **Service-account plumbing** — Wire a Google Sheets API client driven by a `GOOGLE_SERVICE_ACCOUNT_JSON` secret. Add a small helper module exposing `readRange`, `appendRow`, `updateRow`, and a `loadSettings(sheetId)` helper that returns the Settings tab as a key/value map. Surface clear errors when the secret is missing, the sheet isn't shared with the service account, or a tab/header is missing.
2. **Project ↔ sheet linking** — Add `sheetId`, `sheetProvider` (default `"google"`), and `mode` (`"chat"` | `"booking"`) fields to the Project model. Add an endpoint to set/clear the sheet binding which validates the sheet is reachable and the two tabs (`Availability`, `Settings`) exist with the expected headers; returns the service-account email so the admin can share the sheet with it.
3. **Booking tools (Gemini function calling)** — In the chat controller, when a project is in booking mode, load `Settings` to build the system prompt and expose two tools to Gemini: `check_availability(date, time, location)` and `book_slot(date, time, location, name, phone?)`. Run a tool-calling loop: execute tool calls against the sheet, feed results back to Gemini, then return the model's final reply. Use the admin's response templates (`booked_response`, `confirm_response`) when filling in the reply.
4. **Atomic booking & alternatives** — Inside `book_slot`, re-read the target row immediately before writing. If it's already `Booked`, refuse the write and return alternatives. Compute alternatives by reading remaining `Available` rows for the same date/location, optionally bounded by `business_hours` and `slot_duration` from Settings. If no row exists for a requested slot and the time falls inside business hours, append a fresh `Booked` row.
5. **Frontend project settings UI** — In the project detail screen, add a "Booking mode" panel: toggle between Chat and Booking, an input for the Google Sheet ID, a "Connect" button that calls the validate/link endpoint, a copyable display of the service-account email with sharing instructions, and a clear status indicator (Linked / Not shared / Tab missing / etc.). When booking mode is on, the chat box on that project automatically uses the new flow.
6. **Error handling and ops** — Standardize user-facing error messages for the common failure modes (sheet not shared, tab missing, header mismatch, API quota, network timeout). Log full errors server-side. No automatic retries beyond a single transient retry on 5xx from the Sheets API.

## Relevant files
- `server/controllers/chatController.js`
- `server/controllers/projectController.js`
- `server/models/Project.js`
- `server/routes/projectRoutes.js`
- `server/index.js`
- `client/src/components/Projects/ProjectDetail.jsx`
- `client/src/services/projectService.js`
- `server/package.json`