---
name: Mongoose subdocument mutations & full-document re-validation
description: Why findOne+modify+save() silently breaks edits, and the atomic-update fix
---

# Prefer atomic updateOne/$pull over findOne + project.save() for subdoc edits

In this Express/Mongoose app, handlers that did `findOne()` → mutate an array →
`project.save()` could silently fail because `save()` re-validates the ENTIRE document.
If any *other* part of the doc violated the current schema (a legacy field, an oversized
Mixed blob like `bookingSheet.snapshot`, a subdoc missing a now-required field, or a value
outside an `enum` that was tightened later), the save threw and the intended edit never
persisted. Frontends that swallow the error make it look like the button "does nothing".

**Rule:** for deleting/updating a subdocument, use an atomic op
(`Project.updateOne({_id, userId, 'sources._id': sourceId}, { $pull: {...} })`) instead of
load-mutate-save. It skips full-document validation and touches only the targeted path.

**Why:** real user data accumulates documents that no longer pass the current schema;
load-mutate-save couples an unrelated edit to the validity of the whole document.

**How to apply:**
- Put the subdoc id in the *query* (`'sources._id': id`) so `matchedCount===0` cleanly means
  "not found". Do NOT rely on `modifiedCount` if you also `$set updatedAt` — that always marks
  the doc modified, so a missing-target delete would falsely report success.
- For self-heal/cleanup on a GET, do the atomic op in try/catch so a cleanup failure never
  breaks the read path, and mirror the change in the in-memory object for the response.
- When a write MUST rewrite a parent field anyway (e.g. linking a sheet rewrites
  `bookingSheet`), a full save is unavoidable — accept it, but keep unrelated edits atomic.

# Admin model in this app
Single boolean `isAdmin` on the User model — there is NO separate "super admin" tier.
First registered user auto-gets `isAdmin:true`; otherwise toggle in Mongo. `isAdmin` is
embedded in the JWT at login, so a promoted user must log out/in to get admin in their token.
