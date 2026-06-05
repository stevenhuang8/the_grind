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

1. Add a new application — company, role, date, notes
2. Applications live on a **Kanban board** — drag between stages
3. When status changes → AI fires a reaction (roast, hype, encouragement)
4. XP accumulates on your profile — level up as you grind
5. Weekly AI recap — personalized summary of your grind that week
6. Streaks — apply X days in a row, unlock titles

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
| Framework | Next.js 14 (App Router) | Your stack, Vercel-ready |
| Language | TypeScript | Type safety throughout |
| Styling | Tailwind CSS | Fast, consistent |
| Database | Supabase (PostgreSQL) | Auth + persistence |
| AI | Claude API (claude-sonnet-4-20250514) | Roasts, recaps, hype |
| Drag & Drop | @dnd-kit/core | Best DnD lib for React |
| Deploy | Vercel | Instant |

---

## Project Structure

```
grind/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Kanban board (main view)
│   │   ├── layout.tsx                  # Root layout
│   │   ├── globals.css                 # Global styles + RPG theme
│   │   └── api/
│   │       ├── applications/
│   │       │   └── route.ts            # CRUD for applications
│   │       └── ai/
│   │           └── route.ts            # Claude roasts + recaps
│   ├── components/
│   │   ├── KanbanBoard.tsx             # Main board with DnD
│   │   ├── KanbanColumn.tsx            # Individual stage column
│   │   ├── ApplicationCard.tsx         # Draggable job card
│   │   ├── AddApplicationModal.tsx     # New application form
│   │   ├── AIReactionToast.tsx         # AI response popup on status change
│   │   ├── XPBar.tsx                   # Level + XP progress bar
│   │   ├── StatsPanel.tsx              # Streak, total apps, win rate
│   │   └── WeeklyRecap.tsx             # AI weekly summary modal
│   ├── hooks/
│   │   ├── useApplications.ts          # Fetch + mutate applications
│   │   └── useXP.ts                    # XP calculation + level logic
│   ├── lib/
│   │   ├── supabase.ts                 # Supabase client
│   │   ├── xp.ts                       # XP values, level thresholds, titles
│   │   └── utils.ts                    # Shared helpers
│   └── types/
│       └── index.ts                    # Shared types
├── .env.local.example
├── package.json
└── supabase/
    └── schema.sql                      # DB schema
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
  applied_date date not null,
  url text,
  notes text,
  xp_awarded int default 0,
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
```

---

## XP System

| Action | XP |
|---|---|
| Submit application | +50 XP |
| Get any response (not ghosted) | +25 XP |
| Complete a phone screen | +100 XP |
| Complete an interview | +200 XP |
| Complete a final round | +400 XP |
| Get rejected (you fought!) | +75 XP bonus |
| Get an offer | +1000 XP |

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

### 1. Status Change Reaction
Triggered whenever an application changes stage. Tone shifts based on outcome:
- **Applied**: hype / encouragement ("Let's go. Another one in the chamber.")
- **Rejected**: reframe + roast the company ("Their loss. A company that can't send a proper rejection email probably can't ship software either.")
- **Ghosted**: trash talk ("Classic. They saw your resume and panicked.")
- **Interview**: hype ("You got them talking. Now make them regret not hiring you sooner.")
- **Offer**: celebration ("CAMPAIGN COMPLETE. You didn't just find a job — you conquered it.")

### 2. Weekly Recap (Monday morning)
A short, personalized AI-written summary:
> "Week 6 of the Grind. 8 applications. 2 rejections. 1 ghost. Your response rate is climbing. You're built different. Keep moving."

### 3. Roast-on-demand
Button on any ghosted/rejected card: "Roast them" → Claude writes a short, savage (but professional) take on the company.

---

## MVP Feature Checklist

### v1 — Core
- [ ] Supabase auth (email/password)
- [ ] Add / edit / delete applications
- [ ] Kanban board with drag-and-drop between stages
- [ ] XP + level system
- [ ] AI status change reactions (toast popup)
- [ ] Dark RPG UI

### v2 — Polish
- [ ] Streak tracking
- [ ] Weekly AI recap
- [ ] Stats dashboard (response rate, avg time per stage, best day to apply)
- [ ] Roast-on-demand button

### v3 — Multiplayer
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
- **Drag and drop**: @dnd-kit implementation with optimistic UI updates
- **Gamification design**: XP system, levels, streaks — game mechanics applied to real-world UX
- **Emotional design**: built to solve a psychological problem, not just an organizational one
- **Personal project** — you built it because you needed it during your own job search

---

## Getting Started

```bash
npx create-next-app@latest grind --typescript --tailwind --app
cd grind
npm install @dnd-kit/core @dnd-kit/sortable @supabase/supabase-js
cp .env.local.example .env.local
# Add your keys
npm run dev
```# the_grind
