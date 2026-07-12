# Contributing to Rekapin

Thanks for your interest! Rekapin is AGPL-3.0 — contributions are welcome and
stay open source.

## Dev setup

```bash
npm install
cp .env.example .env        # fill DATABASE_URL (Neon) + BETTER_AUTH_SECRET
npm run db:migrate          # apply migrations to your database
npm run dev                 # http://localhost:3000
```

Optional env: `GOOGLE_CLIENT_ID/SECRET` (Google login), `RESEND_API_KEY`
(real email — otherwise verification links are logged to the console),
`BLOB_READ_WRITE_TOKEN` (Vercel Blob — otherwise files land in `.data/`).

## Before you open a PR

All three must be green:

```bash
npx tsc --noEmit
npm run lint
npm run test
```

CI runs the same gates plus a production build.

## Conventions (enforced in review)

- **Code & comments in English; UI copy in Bahasa Indonesia.**
- **Money is integer Rupiah** — never float, never cents.
- **Multi-tenant discipline:** every query filters by `business_id` derived
  from the verified membership (`lib/session.ts` → `requireRole`) — never
  from client input.
- **Two roles:** `admin` and `staff`. Staff = data entry only. Role checks
  live server-side in every action/page; hiding UI is not protection.
- Schema changes go through `npm run db:generate` (drizzle-kit) — commit the
  generated migration, never edit applied migrations.
- Parsing logic stays in pure functions (`lib/parsing/`, `lib/rules/`) with
  unit tests.
- Design tokens are locked (see `CLAUDE.md`) — no new colors.

## Adding a bank preset

`lib/parsing/presets/` — one file per bank implementing `BankPreset`, then
register it in `registry.ts`. Include a synthetic fixture CSV in
`tests/fixtures/` and a unit test. Real-world statement samples (anonymized)
are extremely welcome — presets are currently calibrated from public format
knowledge.

## Security issues

See [SECURITY.md](SECURITY.md) — please report privately, not via issues.
