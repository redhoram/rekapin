# Deploying Rekapin to Vercel

Rekapin is a standard Next.js 15 App Router project — no custom build steps.
The repo is deploy-ready; everything below is account setup and env vars.

## 1. Import the repo

[vercel.com/new](https://vercel.com/new) → Import `redhoram/rekapin` →
Framework preset auto-detects Next.js. Leave build settings default
(`npm run build`). Every push to `main` auto-deploys after this.

## 2. Environment variables

Set these in Vercel → Project → Settings → Environment Variables (Production):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon Postgres connection string (pooler URL) |
| `BETTER_AUTH_SECRET` | ✅ | `openssl rand -base64 32` — generate a NEW one for prod, don't reuse dev |
| `BETTER_AUTH_URL` | ✅ | The production URL, e.g. `https://rekapin.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Same production URL (used in invite/verification links) |
| `BLOB_READ_WRITE_TOKEN` | ✅ | Vercel → Storage → Create Blob store → token. Without it uploads write to the serverless filesystem and vanish |
| `RESEND_API_KEY` | ✅ | resend.com API key. Without it verification/invite emails only go to the server log |
| `RESEND_FROM` | ✅ | Verified-domain sender, e.g. `Rekapin <no-reply@yourdomain.com>`. The default `onboarding@resend.dev` only delivers to your own Resend account email |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Only if Google login is wanted. Add `https://<prod-domain>/api/auth/callback/google` as an authorized redirect URI in Google Cloud Console |

## 3. Database migrations

Migrations are NOT run by the build. Apply them from your machine against the
production `DATABASE_URL` before first deploy (and after any schema change):

```bash
DATABASE_URL="<prod-connection-string>" npx drizzle-kit migrate
```

(If dev and prod share the same Neon database, it's already up to date —
but a separate branch/database per environment is strongly recommended.)

## 4. Post-deploy smoke checklist

1. `/login` renders; sign up with a real email → verification email arrives (Resend).
2. Complete onboarding → upload a bank statement CSV → transactions appear.
3. `/dashboard` and `/reports` render; export one report to Excel.
4. Settings → Anggota → invite a second email → accept flow works end-to-end.
5. Staff account: lands on `/transactions`, gets redirected away from
   `/dashboard`, `/reports`, `/settings`.

## Known limits (MVP)

- One Neon database = one environment. Use Neon branches for dev/prod separation.
- Uploaded originals live in Vercel Blob; deleting a business hard-deletes its
  DB rows but Blob files are not garbage-collected yet.
