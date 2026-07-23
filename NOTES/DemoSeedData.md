# Demo Account Seed Data

## Why

The recruiter demo flow (`NOTES/RecruiterDemoLogin.md`) signs recruiters into a real,
shared Supabase auth account (`DEMO_EMAIL`/`DEMO_PASSWORD`). Until now nothing ever
inserted `applications` rows for that account, so the Kanban board a recruiter lands on
was empty. `scripts/seed-demo.ts` populates it with a curated, in-character set of fake
applications so the board has something to look at and drag around.

---

## What it does

1. Signs in as the demo user via `supabase.auth.signInWithPassword` — same credentials
   and pattern as `app/api/auth/demo-login/route.ts`.
2. Deletes any existing `applications` rows for that user (so the script is safe to
   re-run after a recruiter has messed the board up).
3. Inserts ~15 hand-written applications spread across all 7 `Stage` values
   (`types/index.ts`), with `applied_date` spread over the last ~6 weeks and
   `xp_awarded` computed from `STAGE_XP`, matching how `useApplications.addApplication`
   computes it for real inserts.
4. Logs a per-stage count summary.

No `SUPABASE_SERVICE_ROLE_KEY` is needed — the `applications` insert/delete RLS policies
already allow a signed-in user to manage their own rows
(`with check (auth.uid() = user_id)` in `supabase/schema.sql`), and the script just signs
in as that user like any other client.

## How to run it

```bash
npm run seed:demo
```

Requires `.env.local` to have `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`DEMO_EMAIL`, and `DEMO_PASSWORD` set, and the demo user to already exist in Supabase Auth
(Dashboard → Authentication → Users — see `NOTES/RecruiterDemoLogin.md`'s setup steps).
The script exits with a clear error if sign-in fails.

## Editing the data

The fake applications live in the `SEED_APPLICATIONS` array at the top of
`scripts/seed-demo.ts` — edit that list directly and re-run `npm run seed:demo` to
refresh the demo account.
