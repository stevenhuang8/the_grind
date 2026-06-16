# Recruiter Landing Page (Plan — not yet implemented)

## Why

"The Grind" is a portfolio project. Today `/` is auth-gated — `app/page.tsx` checks
`supabase.auth.getUser()` and redirects straight to `/login` if there's no session. A
recruiter hitting the root domain just bounces to a bare login form with no pitch.

Decisions made (see brainstorm w/ user):
- `/` becomes a public landing page. The Kanban app moves to `/dashboard`.
- Recruiters get a **seeded demo account** via a "View Demo" button — no sign-up required.
- Copy leans into the existing RPG/roast personality (bosses, XP, "they fled the battle," etc.) —
  the README's "Core Concept" table is basically ready-made marketing copy.

Reuse the existing dark/gold theme tokens from `app/globals.css`
(`bg-background`, `text-gold`, `bg-surface`, `bg-card`, `border-grind-border`, `text-muted`).

---

## 1. Routing split: public landing vs. authenticated dashboard

- **Move** the current contents of `app/page.tsx` (auth check → redirect to `/login` →
  render `<KanbanBoard />`) to a new `app/dashboard/page.tsx`, unchanged in logic.
- **Replace** `app/page.tsx` with the new public landing page (no auth check).
- **Update redirects** so post-auth flows land on `/dashboard` instead of `/`:
  - `app/login/page.tsx` (~line 51): `router.push('/')` → `router.push('/dashboard')`
  - `app/reset-password/page.tsx` (~line 35): `router.push('/')` → `router.push('/dashboard')`

No route groups needed at this scale — a single extra top-level route is simplest and
avoids the multi-root-layout caveats (see Next.js route-groups docs).

---

## 2. Landing page content (`app/page.tsx` + `components/landing/*`)

Build as a few small section components under `components/landing/` (e.g. `Hero.tsx`,
`Reframe.tsx`, `Features.tsx`, `TechStack.tsx`, `LandingFooter.tsx`) composed in
`app/page.tsx`. Keep copy in-character with the README's voice.

- **Header/nav**: "THE GRIND" wordmark (same uppercase/tracked gold style as
  `app/login/page.tsx`), with "Sign In" (→ `/login`) and a primary "View Demo" button.
- **Hero**: Tagline ("Your job search is a campaign"), roast-y subhead, two CTAs —
  "Start Your Campaign" (→ `/login`) and "View Demo".
- **Reframe table**: lifted from `README.md`'s "Core Concept" table (Applied → +XP,
  Rejected → Boss defeated, Ghosted → They fled the battle, Offer → Victory).
- **Feature grid**: Kanban quest stages, XP & Levels (Rookie → Untouchable), AI
  roasts/hype (Claude-powered reactions), Weekly recap. Icon/text based — no
  screenshots for v1.
- **Tech stack strip** ("The Arsenal"): Next.js 16, React 19, TypeScript, Tailwind v4,
  Supabase, Claude AI, @dnd-kit.
- **Footer**: GitHub link (placeholder constant for the user to fill in), short "built
  during my own job search" blurb, repeat CTAs.

---

## 3. Seeded demo account

- **New shared Supabase auth user** (manual, one-time, done in the Supabase dashboard —
  Authentication → Add user, disable email confirmation). Credentials go into env vars,
  never the client bundle.
- **New env vars** (document in `.env.local.example`):
  - `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD` — server-only, used for sign-in.
  - `NEXT_PUBLIC_DEMO_USER_ID` — the demo user's UUID, used client-side to detect demo
    mode and render the banner.
  - `DEMO_USER_ID` — server-side copy of the same UUID, used by `/api/ai` and
    `/api/demo/reset`.
- **`lib/demoSeed.ts`**: single source of truth — an array of ~10-12 sample
  `applications` (company/role names in keeping with the RPG flavor, spread across all
  7 stages in `types/index.ts`'s `Stage`, varied `applied_date` over recent weeks,
  `xp_awarded` matching `STAGE_XP`). Used by the reset endpoint below.

---

## 4. "View Demo" sign-in flow

- **New route handler `app/api/demo/route.ts`** (POST): server-side, calls
  `supabase.auth.signInWithPassword({ email: DEMO_USER_EMAIL, password: DEMO_USER_PASSWORD })`
  (mirrors the per-request client pattern in `app/api/jobs/capture/route.ts`), returns
  `{ access_token, refresh_token }`.
- **Landing page "View Demo" button**: client component, POSTs to `/api/demo`, calls
  `supabase.auth.setSession({ access_token, refresh_token })`, then
  `router.push('/dashboard')`.

---

## 5. Demo-mode safeguards

`app/dashboard/page.tsx` already fetches `user` via `getUser()`. Compute
`isDemo = user.id === process.env.NEXT_PUBLIC_DEMO_USER_ID` and pass it (plus `user`)
into `<KanbanBoard />`.

- **Banner**: when `isDemo`, `KanbanBoard.tsx` renders a small persistent strip —
  "DEMO MODE — shared sample account, changes may be visible to others" — with a
  "Reset Demo Data" button.
- **Reset endpoint** `app/api/demo/reset/route.ts`: deletes all `applications` rows
  where `user_id = DEMO_USER_ID` and re-inserts the rows from `lib/demoSeed.ts`.
- **AI cost guard**: `app/api/ai/route.ts` has no auth check today and calls the
  Anthropic API on every stage change/roast — a public "View Demo" button would
  otherwise let anyone rack up API spend. `fetchAIReaction` in `KanbanBoard.tsx` will
  include `isDemo` in its POST body; if `isDemo` is true, `/api/ai/route.ts` skips the
  Anthropic call and returns a random line from a small pool of pre-written
  in-character canned responses per `type`/`stage`.

---

## 6. Files touched

**New:**
- `app/dashboard/page.tsx` (moved from current `app/page.tsx`)
- `app/page.tsx` (new landing page)
- `components/landing/Hero.tsx`, `Reframe.tsx`, `Features.tsx`, `TechStack.tsx`, `LandingFooter.tsx`
- `app/api/demo/route.ts`
- `app/api/demo/reset/route.ts`
- `lib/demoSeed.ts`

**Modified:**
- `app/login/page.tsx` — redirect target → `/dashboard`
- `app/reset-password/page.tsx` — redirect target → `/dashboard`
- `app/api/ai/route.ts` — canned-response branch for demo user
- `components/KanbanBoard.tsx` — accept `user`/`isDemo`, render demo banner + reset
  button, pass `isDemo` through `fetchAIReaction`
- `.env.local.example` — add `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`, `DEMO_USER_ID`,
  `NEXT_PUBLIC_DEMO_USER_ID`

---

## 7. Manual setup (outside this change)

1. Create the demo Supabase auth user, disable email confirmation for it.
2. Add the four demo env vars to `.env.local` (and Vercel project settings for prod).
3. Hit `/api/demo/reset` once (or run an equivalent script) to seed the account initially.
4. Drop in the real GitHub repo URL in `LandingFooter.tsx`.

---

## Out of scope for v1 (follow-ups)

- Real screenshots/GIFs of the Kanban board, XP bar, AI toasts on the landing page.
- OG image / social preview card for link sharing.
- Scheduled auto-reset of demo data (manual "Reset Demo Data" button covers it).

---

## Verification (once implemented)

1. `npm run dev` → visit `/`: landing page renders, no auth redirect, dark/gold theme
   consistent with `/login`.
2. "Sign In" → `/login` unchanged; successful login lands on `/dashboard` with the
   Kanban board.
3. "View Demo" → signs into the demo account, lands on `/dashboard` with seeded
   applications spread across all stages and a populated XP bar.
4. In demo mode, drag a card to trigger an AI reaction → toast shows a canned line,
   confirm (via logs/network) no Anthropic API call is made.
5. "Reset Demo Data" → applications return to the seeded set.
6. Use the `run` skill / browser to check the landing page at desktop and mobile widths.
