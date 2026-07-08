<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white" alt="Next.js 15">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript strict">
  <img src="https://img.shields.io/badge/Neon-Postgres-00E599?logo=postgresql&logoColor=white" alt="Neon Postgres">
  <img src="https://img.shields.io/badge/Built%20with-Claude%20Code-D97757" alt="Built with Claude Code">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL_v3-blue.svg" alt="License: AGPL v3"></a>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.id.md">Bahasa Indonesia</a>
</p>

---

# Rekapin

**Upload your bank statement. Get real financial reports.**

Rekapin turns raw bank statement exports (CSV/Excel) — or a simple Excel template — into cash-basis financial statements: **Profit & Loss, Cash Flow, and Cash Book**, plus a dashboard that answers the questions every small-business owner actually asks: *how much did I earn? what's my gross margin? my net margin? where did the money go?*

Built for Indonesian UMKM. No accounting knowledge required — no journals, no debits and credits. Just upload.

> 🚧 **Status: in development, not production-ready.** MVP steps ①–⑤ have shipped (auth/onboarding, statement import, categorization, reports, dashboard + Excel export). Step ⑥ — polish and Vercel deploy — has **not** started. Known pre-production gaps: email verification is a console-log stub (no transactional email provider wired yet), and the staff-invite flow (FR-1.4/U13) has no UI. Features ship through the `/ship` agent pipeline — follow the commits to watch it being built.

**Build progress (MVP, `/ship` steps):**

| # | Step | Status |
|---|------|--------|
| ① | Skeleton, auth, onboarding | ✅ Shipped |
| ② | Statement upload, parsing, dedup | ✅ Shipped |
| ③ | Categories, rules engine, transactions | ✅ Shipped |
| ④ | Reports (P&L, Cash Flow, Cash Book) | ✅ Shipped |
| ⑤ | Dashboard, margin KPIs, Excel export | ✅ Shipped |
| ⑥ | Polish, deploy to Vercel | ⏳ Not started |

### How It Works

1. **Upload** — bank statement CSV/Excel (BCA, Mandiri, BRI, BNI presets) or the standard Excel template
2. **Map once** — column mapping wizard, saved per bank account
3. **Review** — auto-categorization via rules engine (AI-powered in Phase 2), guaranteed deduplication
4. **Done** — reports and margin dashboard update instantly, export to Excel

### Features (MVP)

- Multi-business support with strict data isolation
- Bank statement import with per-bank presets + universal mapping wizard
- Duplicate-proof: re-uploading the same file never doubles a transaction
- Rules-based auto-categorization that learns from your corrections
- Reports: Profit & Loss, Cash Flow, Cash Book — period comparison, Excel export
- Dashboard: revenue, expenses, net profit, **gross margin, net margin**, trends, top expenses, cash position

**Phase 2:** AI auto-categorization (Claude), PDF statement parsing, budget alerts, and an **AI chat** that answers questions about your finances from real database queries — bring your own key: Claude (default), Gemini, Grok, OpenAI, or OpenRouter via Vercel AI SDK.

### Stack

- **Next.js 15** (App Router) · TypeScript strict · Tailwind CSS + shadcn/ui · Recharts
- **Neon Postgres** + Drizzle ORM · Better Auth · Vercel Blob
- **Claude API** — transaction categorization · **Vercel AI SDK** — multi-provider AI chat (Phase 2)
- Deployed on **Vercel**

### Run

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # type check + production build
```

You'll need a Neon Postgres database and env vars set per `.env.example` (`DATABASE_URL`, `BETTER_AUTH_SECRET`, Google OAuth keys, optional Vercel Blob token). No hosted demo yet — this is a local-dev-only project until step ⑥.

### The Pipeline That Builds This

Every feature ships through a 5-agent pipeline (`/ship [feature]`), artifacts in [`.pipeline/`](./.pipeline):

| Agent | Role |
|-------|------|
| `planner` | Turns the feature request into a technical spec |
| `designer` | Design spec — guided by a bundled `premium-design` skill |
| `coder` | Writes the code from spec + design |
| `tester` | Runs and checks the result |
| `reviewer` | Final verdict — SHIP / NEEDS WORK / BLOCK |

See [CLAUDE.md](./CLAUDE.md) for conventions and the full flow.

### Credit

**Product & direction**
- Redho Ramadhani — [linkedin.com/in/redhoramadhanihamid](https://id.linkedin.com/in/redhoramadhanihamid) · [github.com/redhoram](https://github.com/redhoram)

**Built by**
- [Claude Code](https://claude.com/claude-code) (Anthropic) running the `/ship` 5-agent pipeline

Every commit carries a `Co-Authored-By` trailer — built with AI, owned by the human.

### License

[GNU AGPL-3.0](LICENSE) — free and open source. Use it for anything, including your business. If you modify and distribute it, or run a modified version as a service, your changes must stay open source too. Keep [`NOTICE.md`](NOTICE.md) intact for attribution.
