---
name: Sheet assistant live-data freshness
description: Why "stale Google Sheet" reports are usually prompt behavior, not caching
---

# Sheet assistant staleness is a prompt-behavior problem, not a cache

When users report the connected Google Sheet returns stale/old data in "Sheet assistant"
mode (newly added/edited/deleted rows not reflected), the data pipeline is already live:
the project is reloaded from DB each chat turn, the snapshot is refreshed each turn, and
`read_rows`/`list_tabs` hit the Sheets API directly with no row caching. The only cache in
`googleSheets.js` is auth credentials (`cachedAuth`/`cachedClientEmail`), not sheet contents.

**Root cause:** the system prompt in `runSheetTurn` briefs the model with the snapshot,
which contains only column headers + 2-3 sample rows. The model would answer
content/lookup questions ("is X available", "does Y exist") from those stale sample rows
instead of calling `read_rows`, producing inconsistent/stale answers.

**Fix:** strengthen the system prompt — label the structure block as headers-only (NOT the
data) and add an explicit mandate to call `read_rows` for live data before answering ANY
content/lookup question, on every such turn, never answering from sample rows or prior
tool results.

**Why:** Gemini function-calling agents will skip a tool call if they think the answer is
already in context. The sample rows in the prompt are that tempting (stale) context.

**How to apply:** Don't go hunting for a cache to clear. If freshness must be guaranteed
rather than best-effort, enforce a `read_rows` call server-side for content-intent turns
(heuristic/adds latency — only if prompt approach proves insufficient).
