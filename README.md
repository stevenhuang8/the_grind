# Grind — the job search RPG

> Your job search is a campaign. You're the main character. Companies are the bosses. Rejection just means you're farming XP.

---

## The Problem

Job tracking tools treat rejection like failure. Huntr, Notion, spreadsheets — they're all cold, clinical, and demoralizing. The process is already brutal enough. Your tools shouldn't make it worse.

**Grind reframes the entire experience.** Every application is XP. Every rejection is a boss defeated. Every ghost is a coward who fled the battle. You're not job searching — you're on a campaign.

---

## Core Concept

| What happened | What Grind calls it |
|---|---|
| Applied | +XP gained |
| Got a response | Enemy engaged |
| Rejected | Boss defeated — you fought, they said no, you move on |
| Ghosted | They fled the battle — shame on them |
| Got an offer | Victory — campaign complete |

---

## Core User Flow

1. Add a new application — company, role, date, notes (manually, or captured in one click via the browser extension)
2. Applications live on a **Kanban board** — drag one or many cards between stages
3. When status changes → AI fires a reaction (roast, hype, encouragement)
4. Attach documents (resume, cover letter) to any application
5. XP accumulates on your profile — level up as you grind
6. Stats panel tracks apps, response rate, and streak in real time

---

## Kanban Stages

```
[ Applied ] → [ In Review ] → [ Interview ] → [ Final Round ] → [ Offer ]
                                                                    ↓
                                                              [ Rejected / Ghosted ]
```

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Your stack, Vercel-ready |
| Language | TypeScript | Type safety throughout |
| Styling | Tailwind CSS v4 | Fast, consistent |
| Database | Supabase (PostgreSQL + Auth + Storage) | Auth, persistence, and file attachments |
| AI | Claude API (`claude-sonnet-4-6`) | Roasts, reactions, recaps |
| Drag & Drop | @dnd-kit/core | Multi-select drag between stages |
| Feature Flags | LaunchDarkly | Server-side gating for the recruiter demo login |
| Browser Extension | Chrome MV3 (side panel) | One-click job capture from any job board |
| Deploy | Vercel | Instant |

---

## Project Structure

```
the_grind/
├── app/
│   ├── page.tsx                        # Auth-gated entry — redirects to /login, renders KanbanBoard
│   ├── layout.tsx                      # Root layout
│   ├── globals.css                     # Global styles + dark RPG theme tokens
│   ├── login/page.tsx                  # Server component — evaluates LaunchDarkly demo-login flag
│   ├── reset-password/page.tsx         # Password recovery landing page
│   └── api/
│       ├── ai/route.ts                 # Claude reactions, roasts, weekly recap
│       ├── auth/demo-login/route.ts    # Signs into the shared recruiter demo account
│       └── jobs/capture/route.ts       # AI extraction endpoint for the browser extension
├── components/
│   ├── KanbanBoard.tsx                 # DndContext, multi-select drag, AI toast wiring
│   ├── KanbanColumn.tsx                # Individual stage column
│   ├── ApplicationCard.tsx             # Draggable job card
│   ├── ApplicationDetailModal.tsx      # Read-only detail view + document attachments
│   ├── AddApplicationModal.tsx         # New application form
│   ├── AIReactionToast.tsx             # AI response popup on status change
│   ├── XPBar.tsx                       # Level + XP progress bar
│   ├── StatsPanel.tsx                  # Apps, response rate, streak
│   └── auth/LoginForm.tsx              # Client component — email/password + demo login button
├── hooks/
│   ├── useApplications.ts              # Supabase CRUD, optimistic state
│   ├── useXP.ts                        # Memoized computeStats from lib/xp.ts
│   └── useDocuments.ts                 # Fetch/upload/delete document attachments
├── lib/
│   ├── supabase.ts                     # Supabase client
│   ├── xp.ts                           # XP calculation, levels, streak
│   ├── launchdarkly.ts                 # LD Node SDK singleton, graceful no-op fallback
│   └── utils.ts                        # Shared helpers
├── types/
│   └── index.ts                        # Stage, Application, UserStats, LEVELS, STAGE_XP
├── extension/                          # Chrome MV3 side-panel extension (job capture)
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   └── popup.js
├── scripts/
│   └── seed-demo.ts                    # Seeds the recruiter demo account with sample applications
├── supabase/
│   ├── schema.sql                      # applications + weekly_recaps tables, RLS policies
│   └── documents.sql                   # documents table + Storage bucket RLS policies
├── NOTES/                              # Design/engineering notes per feature
├── .env.local.example
└── package.json
```

---

## Database Schema

```sql
-- applications
create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  company text not null,
  role text not null,
  stage text not null default 'applied',
  applied_date date not null default current_date,
  url text,
  notes text,
  xp_awarded int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- weekly_recaps
create table weekly_recaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  week_start date not null,
  recap_text text not null,
  created_at timestamptz default now()
);

-- documents (resume/cover letter attachments per application)
create table documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) on delete cascade,
  user_id uuid references auth.users(id),
  file_name text not null,
  storage_path text not null,
  file_size integer,
  created_at timestamptz default now()
);
```

All tables have row-level security enabled — users can only read/write their own rows. Files are stored in a private Supabase Storage bucket (`application-documents`), path-scoped as `{userId}/{applicationId}/{timestamp}-{filename}`, with a matching storage policy. Full definitions live in `supabase/schema.sql` and `supabase/documents.sql`.

---

## XP System

XP is driven by an application's **current stage** (`STAGE_XP` in `types/index.ts`) — moving a card re-awards `xp_awarded` for its new stage, and total XP is the sum across all applications.

| Stage | XP |
|---|---|
| Applied | +50 |
| In Review | +25 |
| Interview | +200 |
| Final Round | +400 |
| Offer | +1,000 |
| Rejected | +75 (you fought!) |
| Ghosted | +0 |

### Levels & Titles

| Level | XP Required | Title |
|---|---|---|
| 1 | 0 | Rookie |
| 2 | 500 | Applicant |
| 3 | 1,500 | Grinder |
| 4 | 3,500 | Veteran |
| 5 | 7,000 | The Relentless |
| 6 | 12,000 | Grind Don |
| 7 | 20,000 | Untouchable |

---

## AI Features (Claude API)

All calls go through `app/api/ai/route.ts` via raw `fetch` to `claude-sonnet-4-6` — no SDK.

### 1. Status Change Reaction (`type: "reaction"`)
Triggered whenever an application changes stage. Tone shifts based on outcome:
- **Applied**: hype / encouragement
- **In Review**: encouragement — "you're in the door"
- **Interview / Final Round**: genuine hype, building tension
- **Rejected**: reframe + light roast of the company
- **Ghosted**: trash talk the company, boost the user
- **Offer**: full celebration — campaign complete

### 2. Roast-on-demand (`type: "roast"`)
Savage-but-professional take on a company that ghosted or rejected the user. API endpoint exists; wiring a "Roast them" button onto ghosted/rejected cards is a v2 item.

### 3. Weekly Recap (`type: "recap"`)
Generates a short, personalized weekly summary from the user's stats. API endpoint exists; not yet wired into the UI (no scheduled trigger or recap modal yet).

---

## Browser Extension — One-Click Capture

A Chrome MV3 extension (`extension/`) that captures a job posting straight into Grind while you're browsing.

- **Side panel, not popup** — Chrome popups close on any page click, which breaks a form you need to fill in while reading the listing. The side panel (Chrome 114+) stays open across clicks and navigation.
- **Own auth session** — signs in directly against the Supabase REST API (no bundled SDK) and stores the session in `chrome.storage.local`, independent of the main app's session.
- **Layered extraction** — sends `document.title` plus DOM-noise-stripped page text (nav/header/footer removed) to Claude, with site-specific container selectors for LinkedIn, Greenhouse, Lever, Indeed, and Workday as a fallback boost, not a dependency.
- **Flow**: open the side panel on a job page → auto-extracts via `POST /api/jobs/capture` → Claude returns `{ company, role, notes }` → user reviews/edits → saves directly to Supabase.

Install for local dev: `chrome://extensions` → Developer mode → Load unpacked → `extension/`. Requires the Next.js app running locally (`npm run dev`) since capture calls `localhost:3000`.

---

## Recruiter Demo Mode

A `?ref=recruiter` link (e.g. on a resume) reveals a "Continue as Demo" button on `/login`, gated by a LaunchDarkly boolean flag (`demo-login`) evaluated server-side — no signup needed to explore the app.

- `app/login/page.tsx` reads `searchParams.ref` and calls `getFlag('demo-login', false, …)`; if LaunchDarkly is unreachable or unconfigured, it fails closed (button stays hidden).
- Clicking the button hits `POST /api/auth/demo-login`, which signs into a shared, pre-seeded Supabase account and hands the client a session.
- `npm run seed:demo` (`scripts/seed-demo.ts`) populates that account with ~15 sample applications spread across all stages, so the demo board isn't empty. Safe to re-run — it clears and re-inserts.
- The LaunchDarkly flag doubles as a kill switch: turn it off to hide the demo button everywhere with no redeploy.

A public marketing landing page at `/` (with the demo button surfaced there instead of behind a query param) is planned but not yet built — see `NOTES/RecruiterLandingPage.md`. Today `/` is still the auth-gated Kanban app.

---

## Feature Status

### Shipped
- [x] Supabase auth (email/password, forgot/reset password)
- [x] Add / edit / delete applications
- [x] Kanban board with drag-and-drop, including multi-select drag
- [x] XP + level system
- [x] AI status-change reactions (toast popup)
- [x] Stats panel — total apps, response rate, streak
- [x] Document attachments per application (resume, cover letter, via Supabase Storage)
- [x] Browser extension — one-click job capture from any job board
- [x] Recruiter demo login gated by LaunchDarkly, with seeded demo data
- [x] Dark RPG UI

### Not yet wired up
- [ ] Weekly AI recap (endpoint exists, no UI trigger)
- [ ] Roast-on-demand button on ghosted/rejected cards (endpoint exists, no UI button)
- [ ] Public recruiter landing page at `/` (see `NOTES/RecruiterLandingPage.md`)

### v3 — Multiplayer (future)
- [ ] Friend system — see each other's grind stats
- [ ] Weekly leaderboard — who applied the most this week
- [ ] Share your level / title card

---

## Design Direction

- **Dark, cinematic RPG** — deep blacks, muted golds, subtle red accents
- **Fonts**: Display font with weight + character for headings; clean mono or sans for data
- **No soft pastels, no purple gradients** — this is a war room, not a wellness app
- **Kanban columns** feel like quest stages, not a spreadsheet
- **XP bar** lives persistently at the top — always visible progress

---

## Portfolio Talking Points

- **Full-stack**: Next.js + Supabase auth + PostgreSQL + REST API routes
- **AI integration**: Claude API for dynamic, context-aware text generation
- **Drag and drop**: @dnd-kit implementation with multi-select and optimistic UI updates
- **Browser extension**: Chrome MV3 side panel, layered DOM extraction, independent auth session
- **Feature flagging**: LaunchDarkly-gated recruiter demo mode with a server-side kill switch
- **Gamification design**: XP system, levels, streaks — game mechanics applied to real-world UX
- **Emotional design**: built to solve a psychological problem, not just an organizational one
- **Personal project** — built during the author's own job search

---

## Getting Started

```bash
git clone <repo-url>
cd the_grind
npm install
cp .env.local.example .env.local
# Fill in Supabase, Anthropic, demo account, and LaunchDarkly keys
```

In the Supabase SQL editor, run `supabase/schema.sql` then `supabase/documents.sql`. Create a private Storage bucket named `application-documents`. Disable email confirmation in Supabase Auth settings for easier local testing.

```bash
npm run dev          # http://localhost:3000
npm run seed:demo    # optional — populate the recruiter demo account
```

To try the browser extension locally: `chrome://extensions` → Developer mode → Load unpacked → `extension/` (requires `npm run dev` running).
