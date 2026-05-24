# Compliance House Chat App

## Overview
A full-stack AI chat application built for UK Healthcare (NHS) professionals. Features the "Compliance House" AI agent — an intelligent assistant for NHS compliance, regulations, DBS checks, Right to Work, and professional communications.

## Tech Stack
- **Frontend**: React 19 + Vite + Material UI 7 + Tailwind CSS 4 + React Router 7
- **Backend**: Node.js + Express on port 8000
- **Database**: MongoDB via Mongoose (external, configured via MONGODB_URI secret)
- **AI**: Google Gemini (`gemini-2.5-flash`) via `@google/generative-ai` for both the main Compliance House chat and the source-grounded Projects chat
- **Auth**: JWT-based authentication with bcryptjs password hashing

## Project Structure
```
client/         # React frontend (Vite, port 5000)
  src/
    components/ # Auth and Chat UI components
    services/   # API services (authService, chatService)
    App.jsx     # Main app + routing
server/         # Express backend (port 8000)
  config/       # MongoDB connection
  controllers/  # Route logic (auth, chat, conversations)
  middleware/   # JWT auth middleware
  models/       # Mongoose schemas
  routes/       # API route definitions
```

## Workflows
- **Start application**: `cd client && npm run dev` — Vite frontend on port 5000 (webview)
- **Backend API**: `cd server && npm start` — Express backend on port 8000 (console)

## Environment Variables / Secrets Required
- `MONGODB_URI` — MongoDB Atlas connection string
- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) — Google Gemini API key, powers all AI features
- `JWT_SECRET` — Secret key for signing JWT tokens
- `GOOGLE_CLIENT_ID` (optional) — Google OAuth client ID for "Continue with Google" sign-in
- See `server/.env.example` and `client/.env.example` for the complete documented list.
- Server fails fast on startup with a friendly bullet list if any required variable is missing.

## Projects feature — Sources
Each project holds an array of "sources" the AI can answer from:
- **File upload** — `POST /api/projects/:id/sources` (multipart, 25MB limit). Supports PDF, DOCX, XLSX/XLS/ODS, CSV/TSV, plain text, Markdown, JSON, HTML.
- **Sheet share link (Google Sheets OR Excel on OneDrive/SharePoint)** — `POST /api/projects/:id/sources/link` with `{ url }`. `parseSheetUrl()` recognizes `docs.google.com/spreadsheets/...` (builds the XLSX export URL), `1drv.ms` / `onedrive.live.com` / `*.sharepoint.com` (builds `https://api.onedrive.com/v1.0/shares/u!<base64url>/root/content` — the documented public-share trick that returns the underlying xlsx without auth). User input must be https. Download walks redirects manually with `redirect: 'manual'` (max 6 hops), revalidating both protocol (https) and host against an allowlist on every hop — closes SSRF/open-redirect chaining. Allowlist: `docs.google.com`, `drive.google.com`, `*.googleusercontent.com`, `api.onedrive.com`, `onedrive.live.com` (+sub), `1drv.ms`, `1drv.com` (+sub), `*.sharepoint.com`. 25MB streaming cap and 30s timeout. The original share URL is stored in `sourceSchema.sourceUrl` so the UI can show an "Open" link. Sheet must be publicly shared (Anyone with link → Viewer/View) — server returns a friendly, provider-specific instruction if it isn't.

## Key Configuration
- Vite proxies `/api/*` requests to `http://localhost:8000` in development
- Frontend uses `VITE_API_URL` env var (defaults to `http://localhost:3010/api` fallback, but proxy handles dev routing)
- `allowedHosts: true` in Vite config for Replit iframe proxy compatibility

## UI Design — Obsidian Theme
All three main views (Login, Register, Chat) use the **Obsidian** design system:
- **Palette**: Pure black (`#000000` / `#0a0a0a`) backgrounds, neon green (`#00ff88`) accents
- **Typography**: Space Grotesk (loaded via Google Fonts in `client/index.html`)
- **Layout**: Asymmetric split-screen on desktop — left panel shows neon grid + geometric NHS/AI text; right panel hosts the form
- **Inputs**: Borderless (bottom-border only), no border radius, neon focus states
- **Buttons**: Sharp-cornered neon green CTA, transitions to white on hover
- **Icons**: `lucide-react` package (Mail, Lock, User, ArrowRight, Eye/EyeOff)
- **Chat**: Black sidebar with neon grid, user bubbles in neon green, AI bubbles in `#0d0d0d` with neon border, input bar with sharp neon focus ring

## AI Agent
The "Compliance House" agent is configured in `server/controllers/chatController.js`:
- Uses `gpt-4o` model
- Equipped with OpenAI file search (vector store) and web search tools
- Restricted web search to NHS/CQC domains
- Persona: UK NHS compliance expert with a WhatsApp-style communication approach
