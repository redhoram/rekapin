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
- All money values: integer (Rupiah, no cents) — never float
- Accounting basis: cash basis. `TRANSFER`-type categories are excluded from P&L and margins
- Test on localhost first before pushing to production
- License: PolyForm Noncommercial 1.0.0 — keep `LICENSE.md`, `NOTICE.md`, and attribution footer intact

## /ship pipeline

This project uses 5 subagents (planner, designer, coder, tester, reviewer) in `.claude/agents/`.
The `/ship [feature description]` command runs them in order (designer is skipped automatically if the feature has no UI surface).
See `.claude/commands/ship.md` for the full flow.

The **designer** consults a bundled `premium-design` skill (`.claude/skills/premium-design/`) as its quality bar — palette discipline, typography metrics, intentional motion, and context adaptation (restraint for dashboards, bold for marketing surfaces).

For small/simple tasks, `/ship` isn't required — just ask Claude Code directly.
