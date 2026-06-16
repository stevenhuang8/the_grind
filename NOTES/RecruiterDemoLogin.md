# Recruiter Demo Login via LaunchDarkly

## Overview

A `?ref=recruiter` link on your resume shows a "Continue as Demo" button on the login page. The button visibility is controlled by a LaunchDarkly feature flag evaluated server-side. Clicking it signs into a seeded demo Supabase account — no credentials needed.

---

## Flow

```
Resume link: yourapp.com/login?ref=recruiter
                      │
                      ▼
        app/login/page.tsx (server component)
          reads searchParams.ref = "recruiter"
          calls getFlag('demo-login', false, { ref: 'recruiter' })
                      │
                      ▼
        LaunchDarkly Node SDK evaluates flag
          rule: if ref = "recruiter" → true
          default: false
                      │
             ┌────────┴────────┐
           true              false
             │                  │
     LoginForm renders     LoginForm renders
     demo button           normal form only
             │
             ▼
     User clicks "Continue as Demo"
             │
             ▼
     POST /api/auth/demo-login
     Supabase signInWithPassword(DEMO_EMAIL, DEMO_PASSWORD)
     Returns { access_token, refresh_token }
             │
             ▼
     Client calls supabase.auth.setSession()
     router.push('/') — user is in as demo account
```

---

## Files

| File | Action | Notes |
|------|--------|-------|
| `lib/launchdarkly.ts` | Create | LD Node SDK singleton, graceful no-op fallback if SDK key missing |
| `app/api/auth/demo-login/route.ts` | Create | POST → `signInWithPassword(DEMO_EMAIL, DEMO_PASSWORD)` → returns session |
| `app/login/page.tsx` | Refactor | Convert to server component; reads `searchParams.ref`, evaluates LD flag, passes `showDemo` to form |
| `components/auth/LoginForm.tsx` | Create | Extracts current login form as client component; conditionally renders demo button |
| `.env.local` | Update | Add `LAUNCHDARKLY_SDK_KEY`, `DEMO_EMAIL`, `DEMO_PASSWORD` |

---

## Key Decisions

1. **Session handoff**: The demo-login API route signs in server-side and returns `{ access_token, refresh_token }`. The client calls `supabase.auth.setSession()` — avoids needing `@supabase/ssr` and keeps changes minimal.

2. **Server component split**: `app/login/page.tsx` becomes a thin server component (reads params + evaluates flag), and `LoginForm.tsx` stays `'use client'`. The form needs `useState` and `useRouter` so it must stay a client component.

3. **Graceful fallback**: If `LAUNCHDARKLY_SDK_KEY` is missing or LD is unreachable, `getFlag()` returns the default (`false`) — the demo button simply won't appear.

4. **No `@supabase/ssr` needed**: Session is set client-side via `setSession()` after the API route returns tokens.

---

## Environment Variables

```bash
# LaunchDarkly (server-side only — no NEXT_PUBLIC_ prefix)
LAUNCHDARKLY_SDK_KEY=sdk-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Demo Supabase account credentials (server-side only)
DEMO_EMAIL=demo@yourdomain.com
DEMO_PASSWORD=your_demo_password_here
```

---

## LaunchDarkly Dashboard Setup

1. Create account at launchdarkly.com
2. Create a new **boolean flag** — key must be exactly: `demo-login`
3. Go to **Project Settings → Environments** → copy the **Server-side SDK key** (not client-side ID)
4. Add a targeting rule:
   - **IF** `ref` **is one of** `recruiter` → serve `true`
   - **Default rule** → serve `false`
5. Enable targeting

### Kill Switch
Turn the flag **off** in the LD dashboard to immediately hide the demo button everywhere. No redeploy needed.

---

## Supabase Setup (one-time)

1. Go to Supabase Dashboard → Authentication → Users
2. Click **Add user** → **Create new user**
3. Enter the email and password matching `DEMO_EMAIL` / `DEMO_PASSWORD`
4. Optionally seed the demo account with realistic job application data tied to its user ID

---

## Resume Link

```
https://yourapp.com/login?ref=recruiter
```

Anyone clicking this link sees the demo button. Anyone who types the URL directly does not.

---

## Security Notes

- Demo credentials live in server-only env vars — never exposed to the browser
- `LAUNCHDARKLY_SDK_KEY` has no `NEXT_PUBLIC_` prefix — server-side only
- RLS policies remain active for the demo user — same security boundary as real users
- Demo account data can be scoped by seeding specific rows tied to its user ID

---

## Package to Install

```bash
pnpm add @launchdarkly/node-server-sdk
```
