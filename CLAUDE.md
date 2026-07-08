# Rekapin — Project Instructions

**Rekapin** — aplikasi laporan keuangan otomatis untuk UMKM Indonesia: upload mutasi rekening (CSV/Excel)
atau Excel input manual → transaksi terkategorisasi otomatis → laporan keuangan (Laba Rugi,
Arus Kas, Buku Kas) + dashboard margin (gross/net) langsung jadi. Scope lengkap ada di
`PRD.md` dan arsitektur di `RANCANGAN.md` — keduanya **dokumen lokal, sengaja di-gitignore**
(internal saja, jangan pernah di-commit).

## Stack

- Frontend: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Next.js API Routes / Server Actions
- Database: Neon Postgres + Drizzle ORM
- Auth: Better Auth
- Storage: Vercel Blob (file upload asli)
- AI Engine: Claude API (Haiku 4.5 — auto-kategorisasi transaksi; Fase 2: parsing PDF)
- AI Chat (Fase 2): Vercel AI SDK — multi-provider BYOK (Claude default, Gemini, Grok, OpenAI, OpenRouter)
- Charts: Recharts
- File parsing: SheetJS (xlsx) + PapaParse (CSV)
- Deploy: Vercel

## Conventions

- Code & comments: English
- Communication language with user: Indonesian
- Never commit `.env*` or any API key to Git
- Multi-tenant: every query MUST filter by `business_id` — no cross-tenant data leaks
- Two roles per business: `admin` and `staff`. Staff = data entry only (upload, transactions, categorization) — NO access to reports, dashboard, settings, or member management. Enforce role checks server-side in every endpoint/server action; hiding UI is not protection
- All money values: integer (Rupiah, no cents) — never float
- Accounting basis: cash basis. `TRANSFER`-type categories are excluded from P&L and margins
- Test on localhost first before pushing to production
- License: GNU AGPL-3.0 — keep `LICENSE`, `NOTICE.md`, and attribution footer intact

## Design tokens (shared visual identity with minihire)

Theme: `data-theme` attribute on `<html>` + Tailwind v4 `@custom-variant dark`.
Dark ("night") is default; toggle in header persists via `localStorage` (key `rekapin_theme`).
Apply saved theme in an inline `<head>` script before hydration (no theme flash) and set
`colorScheme` — same pattern as minihire's `app/layout.tsx`.

Fonts (via `next/font/google`, same as minihire):
- **Space Grotesk** — headings/display (`--font-space-grotesk`)
- **Inter** — body text (`--font-inter`)

| Token | Night (default) | Day |
|---|---|---|
| `--bg` | `#0A0A0A` | `#FAF0E6` |
| `--bg-card` | `#1A1A1A` | `#FFFFFF` |
| `--text` | `#FAF0E6` | `#0A0A0A` |
| `--text-muted` | `#8B7B6E` | `#7A6B5E` |
| `--border` | `#2E2E2E` | `#D5C8B8` |
| `--yellow` (accent) | `#F5C518` | `#F5C518` |
| `--yellow-hover` | `#E2B400` | `#E2B400` |
| `--money-pos` (naik/laba) | `#57C08A` | `#0E7A4D` |
| `--money-neg` (turun/rugi/saldo minus) | `#EB7A6B` | `#B33A28` |

These hex values are fixed — do not substitute. The two semantic money tokens were
locked by the step-④ design (reports): hue is never the sole signal — a colored number
is always co-signed by a glyph/sign (▲▼, `−`), and positive money stays grayscale by
default (green only on increase deltas and cost-line inflow anomalies).

## /ship pipeline

This project uses 5 subagents (planner, designer, coder, tester, reviewer) in `.claude/agents/`.
The `/ship [feature description]` command runs them in order (designer is skipped automatically if the feature has no UI surface).
See `.claude/commands/ship.md` for the full flow.

The **designer** consults a bundled `premium-design` skill (`.claude/skills/premium-design/`) as its quality bar — palette discipline, typography metrics, intentional motion, and context adaptation (restraint for dashboards, bold for marketing surfaces).

For small/simple tasks, `/ship` isn't required — just ask Claude Code directly.
