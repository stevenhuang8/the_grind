# Forgot Password / Password Reset Flow

## Changes

**`app/login/page.tsx`**
- Added `handleForgotPassword` — calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: .../reset-password })` with the user's email
- Added a "Forgot password?" button (right-aligned, below the password field, login mode only)
- If the email field is empty when clicked, shows an inline error prompting the user to fill it in

**`app/reset-password/page.tsx`** (new)
- Listens for Supabase's `PASSWORD_RECOVERY` auth event via `onAuthStateChange`
- Shows a loading state ("Verifying reset link...") until the event fires
- Once ready, renders a form with new password + confirm fields
- On submit, calls `supabase.auth.updateUser({ password })` then redirects to `/`

## Setup Required

In the Supabase dashboard under **Authentication → URL Configuration → Redirect URLs**, add:

```
http://localhost:3000/reset-password
https://<your-production-domain>/reset-password
```

Without this, Supabase will reject the `redirectTo` in the reset email.
