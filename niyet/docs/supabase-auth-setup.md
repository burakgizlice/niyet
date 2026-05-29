# Supabase Auth setup (Block 17)

Developer runbook for configuring authentication in the Supabase dashboard.
Not shipped to users — kept in the repo for onboarding and re-provisioning.

Project ref: `datgdkitqrbmpppkjdbt` · URL: `https://datgdkitqrbmpppkjdbt.supabase.co`

The app uses two passwordless methods: **email magic link** and **Google OAuth**.
There is no password auth (excluded by the PRD).

---

## 1. Email — magic link

Dashboard → **Authentication → Providers → Email**

- Enable the provider.
- Ensure **Magic Link** is on.
- Leave **Confirm email** at its default. Magic link via `signInWithOtp` is
  self-confirming — the link click *is* the confirmation — so no separate
  email-confirmation step is required.

## 2. Google OAuth

### a. Google Cloud Console

1. Create (or reuse) a project at <https://console.cloud.google.com>.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID.**
3. Application type: **Web application**.
4. Under **Authorised redirect URIs**, add the Supabase callback exactly:

   ```
   https://datgdkitqrbmpppkjdbt.supabase.co/auth/v1/callback
   ```

5. Copy the generated **Client ID** and **Client Secret**.

### b. Supabase dashboard

Dashboard → **Authentication → Providers → Google**

- Enable the provider.
- Paste the **Client ID** and **Client Secret** from above.
- Save.

## 3. URL configuration

Dashboard → **Authentication → URL Configuration**

- **Site URL:** `https://niyet.burakgizlice.com`
- **Redirect URLs (at launch — production only):**

  ```
  https://niyet.burakgizlice.com/**
  ```

  Do **not** add the `*.pages.dev` wildcard yet — preview-URL auth is deferred
  until production is live (decision C5). When preview auth is prioritised, add
  the Cloudflare Pages wildcard here and update `src/lib/authConfig.js`.

- **Local development:** add `http://localhost:5173/**` (Vite's default dev port)
  to the redirect allowlist manually so magic links resolve during local work.
  The app never sends `window.location.origin` as the redirect — it always uses
  the hardcoded `REDIRECT_URL` — so only explicitly registered origins are ever
  trusted. (Google OAuth additionally requires HTTPS, so Google sign-in is best
  tested against a deployed preview/production URL rather than the local HTTP
  dev server.)

## 4. Security note

The Supabase **anon key** is safe to commit and ship in the browser bundle —
Row Level Security (Block 16) enforces per-user row isolation server-side. The
**service_role** key must never appear in client code or this repo.
