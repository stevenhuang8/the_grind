# The Grind — Engineering Notes

## Project Overview

Gamified job application tracker. RPG-themed kanban board where every application is XP. Built with Next.js 16 (App Router), React 19, Tailwind v4, Supabase, and Claude AI.

---

## Architecture

```
Browser (Next.js app @ localhost:3000)
├── app/page.tsx              — auth-gated entry, redirects to /login if no session
├── app/login/page.tsx        — Supabase email/password auth + forgot password
├── app/api/ai/route.ts       — Claude reactions on stage change / weekly recap
├── app/api/jobs/capture/     — AI extraction endpoint for browser extension
├── components/KanbanBoard    — DndContext + stage columns + AI toast
├── hooks/useApplications     — Supabase CRUD, optimistic state
└── hooks/useXP               — memoized computeStats from lib/xp.ts

Chrome Extension (extension/)
├── manifest.json             — MV3, sidePanel permission, background service worker
├── background.js             — sets openPanelOnActionClick (8 lines)
├── popup.html                — dark RPG UI, 5 views: setup/auth/loading/form/success
└── popup.js                  — auth via Supabase REST, multi-strategy extraction, save
```

---

## Browser Extension

### Why SidePanel (not popup)

Chrome popups close the moment the user clicks anywhere on the page. For a form that requires reading the job listing while filling in details, this is unusable. The Chrome SidePanel API (Chrome 114+, ~98% of users) keeps the panel open across clicks, tab focus changes, and page navigation. It's the same HTML/JS — just a different mount point.

**To install (dev):** `chrome://extensions` → Developer mode → Load unpacked → `extension/`

### Auth

No SDK bundled in the extension. Uses Supabase REST API directly:
- Sign in: `POST /auth/v1/token?grant_type=password`
- Refresh: `POST /auth/v1/token?grant_type=refresh_token`
- Session stored in `chrome.storage.local` (isolated per extension, survives browser restart)
- Config (Supabase URL, anon key, app URL) stored in `chrome.storage.sync`

The extension manages its own session — it does NOT share the main app's localStorage session. The user logs in once in the extension and stays logged in.

### Extraction Strategy (multi-layer)

The naive approach (`document.body.innerText.slice(0, 15k)`) sends LinkedIn's nav/sidebar text to Claude first because the DOM renders nav before main content. Claude gets "0 notifications, Home, My Network..." and can't extract anything useful.

Fixed approach, in priority order:

1. **`document.title`** — Always included. LinkedIn format: `"Senior Engineer at Google | LinkedIn"`. Claude uses this as primary signal for company + role. Works even before React hydrates the job content.

2. **Strip DOM noise** — Clone `document.body`, remove `nav, header, footer, [role="navigation"], script, style` from the clone, THEN call `innerText`. Gets job content without sidebar clutter.

3. **Site-specific containers** — Try known selectors before falling back to full cleaned body:
   | Site | Selector |
   |---|---|
   | LinkedIn | `.jobs-details__main-content`, `.scaffold-layout__main` |
   | Greenhouse | `#app_body`, `.job__description` |
   | Lever | `.posting-description`, `main` |
   | Indeed | `#jobDescriptionText` |
   | Workday | `[data-automation-id="job-posting-details"]` |

4. **Full cleaned body** — Fallback if no site-specific selector matches.

### Capture Flow

```
User opens side panel on a job page
  → auto-triggers extraction
  → content script inlined via chrome.scripting.executeScript
  → { url, pageText } sent to POST /api/jobs/capture (localhost:3000)
  → API validates bearer token via supabase.auth.getUser(token)
  → Claude extracts { company, role, notes }
  → Extension shows pre-filled editable form
  → User confirms / edits
  → POST /rest/v1/applications (Supabase REST, no SDK)
  → Success view with XP earned + "Capture Another" button
```

### /api/jobs/capture

New route added for the extension. Key details:
- Creates a **fresh Supabase client per request** (not the shared `lib/supabase.ts` singleton) to avoid session state bleed between requests
- CORS headers set to `*` — required because the extension origin is `chrome-extension://`
- Handles `OPTIONS` preflight for browser CORS
- Strips Claude's markdown code fences before `JSON.parse` (Claude occasionally wraps output in ` ```json ` blocks even when told not to)

---

## XP System

| Stage | XP |
|---|---|
| Applied | 50 |
| In Review | 25 |
| Interview | 200 |
| Final Round | 400 |
| Offer | 1,000 |
| Rejected | 75 |
| Ghosted | 0 |

`xp_awarded` on each row reflects the XP for its current stage. Moving a card from Applied → Interview changes `xp_awarded` from 50 → 200. Total XP = sum of all `xp_awarded`.

Levels defined in `types/index.ts` → `LEVELS[]`. Computed in `lib/xp.ts` → `computeStats()`.

---

## AI Integration

All Claude calls use `claude-sonnet-4-6` via raw fetch (no SDK) — the route already existed as scaffolding in this pattern, so it was kept consistent.

**Route types:**
- `reaction` — triggered on stage change or new application (1-2 sentences, tone matches the stage)
- `recap` — weekly summary (not wired to UI yet, API endpoint exists)
- `roast` — on-demand for ghosted/rejected cards (v2)

---

## No-Gos

- **Site-specific scrapers for 30+ job boards** — maintenance black hole; the AI + layered extraction handles all boards without code changes when sites update their DOM
- **Bypassing LinkedIn anti-bot measures** — we only read what's already rendered for the logged-in user; no need to touch this
- **Background tab crawling / monitoring** — ToS violation + MV3 service workers are ephemeral anyway
- **Exposing `ANTHROPIC_API_KEY` in the extension bundle** — visible in DevTools to any user; all AI calls proxy through the Next.js API route
- **Firefox extension support** — different SidePanel API, requires webextensions-polyfill; not worth it in v1

---

## Rabbit Holes (avoid)

- **"Highlight to capture" text selection mode** — requires a persistent content script + bidirectional message passing between content script and side panel. Interesting for v2, but site CSP policies on LinkedIn can block content scripts.

- **Content script floating overlay** (Grammarly-style) — same persistence benefit as SidePanel but fights with job site CSS, requires careful shadow DOM isolation, more permissions. SidePanel is simpler.

- **Per-site maintained CSS selector libraries** — Greenhouse/Lever/Workday update their DOM regularly. Selectors are a bonus fallback, not a dependency. Don't invest in maintaining them.

- **LinkedIn SPA loading race** — LinkedIn's React app renders job content asynchronously after navigation. Adding `MutationObserver` + retry logic to wait for content is complex. The `document.title` trick works even before React hydrates, so this is solved at no cost.

- **Auth session sync between extension and main app** — having the user log in once in the main app and reusing that session in the extension requires postMessage + deeplinks + cross-origin trust. The extension's own login is simpler and avoids coupling.

- **OAuth/PKCE flow for extension auth** — needs `identity` permission + service worker + server-side callback. Password flow with `chrome.storage.local` is simpler and uses the same Supabase project the user already has.

---

## Env Setup

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

Copy `.env.local.example` → `.env.local`. Run `supabase/schema.sql` in Supabase SQL editor. Disable email confirmation in Supabase Auth settings for easier local testing.

---

## Running Locally

```bash
npm run dev          # starts at localhost:3000
```

Extension: `chrome://extensions` → Developer mode → Load unpacked → `extension/`

For the extension to call the capture API, the Next.js app must be running locally.
