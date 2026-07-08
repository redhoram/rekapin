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

**Upload mutasi rekeningmu. Laporan keuangan langsung jadi.**

Rekapin mengubah file export mutasi rekening (CSV/Excel) — atau template Excel sederhana — menjadi laporan keuangan berbasis kas: **Laba Rugi, Arus Kas, dan Buku Kas**, plus dashboard yang menjawab pertanyaan yang benar-benar ditanyakan pemilik usaha: *untung berapa? gross margin berapa? net margin berapa? uangnya ke mana?*

Dibuat untuk UMKM Indonesia. Tanpa perlu paham akuntansi — tanpa jurnal, tanpa debit-kredit. Cukup upload.

> ✅ **MVP selesai — live di production.** Semua 6 langkah `/ship` sudah SHIP, termasuk deploy Vercel beneran, teruji end-to-end (daftar → verifikasi email → onboarding → upload mutasi → kategorisasi → laporan → export Excel → undang staff). Fitur dibangun lewat pipeline agent `/ship` — ikuti commit-nya untuk melihat proses build-nya.

**Progress build (MVP, langkah `/ship`):**

| # | Langkah | Status |
|---|---------|--------|
| ① | Skeleton, auth, onboarding | ✅ SHIP |
| ② | Upload mutasi, parsing, dedup | ✅ SHIP |
| ③ | Kategori, rules engine, transaksi | ✅ SHIP |
| ④ | Laporan (Laba Rugi, Arus Kas, Buku Kas) | ✅ SHIP |
| ⑤ | Dashboard, KPI margin, export Excel | ✅ SHIP |
| ⑥ | Polish, deploy Vercel | ✅ SHIP |

Hardening pasca-MVP yang ikut dikerjakan pas langkah ⑥: upgrade keamanan dependency (better-auth, drizzle, xlsx — 0 vulnerability), email transaksional beneran via Resend, dan alur undang/kelola anggota staff lengkap (FR-1.4). Lihat [DEPLOY.md](DEPLOY.md) buat runbook deploy-nya.

### Cara Kerja

1. **Upload** — mutasi CSV/Excel (preset BCA, Mandiri, BRI, BNI) atau template Excel standar
2. **Mapping sekali** — wizard pemetaan kolom, tersimpan per rekening
3. **Review** — kategorisasi otomatis via rules engine (ber-AI di Fase 2), bebas duplikat
4. **Selesai** — laporan & dashboard margin langsung ter-update, export ke Excel

### Fitur (MVP)

- Multi-bisnis dengan isolasi data ketat
- Import mutasi bank: preset per bank + wizard mapping universal
- Anti-dobel: upload ulang file yang sama tidak pernah menggandakan transaksi
- Kategorisasi otomatis berbasis rules yang belajar dari koreksimu
- Laporan: Laba Rugi, Arus Kas, Buku Kas — banding periode, export Excel
- Dashboard: pendapatan, beban, laba bersih, **gross margin, net margin**, tren, top beban, posisi kas

**Fase 2:** AI kategorisasi otomatis (Claude), parsing PDF mutasi, budget alert, dan **AI chat** yang menjawab pertanyaan keuanganmu dari query database sungguhan — bawa API key sendiri: Claude (default), Gemini, Grok, OpenAI, atau OpenRouter via Vercel AI SDK.

### Stack

- **Next.js 15** (App Router) · TypeScript strict · Tailwind CSS + shadcn/ui · Recharts
- **Neon Postgres** + Drizzle ORM · Better Auth · Vercel Blob
- **Claude API** — kategorisasi transaksi · **Vercel AI SDK** — AI chat multi-provider (Fase 2)
- Deploy di **Vercel**

### Menjalankan

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # type check + production build
```

Butuh database Neon Postgres dan env var sesuai `.env.example` (`DATABASE_URL`, `BETTER_AUTH_SECRET`, key Google OAuth, token Vercel Blob opsional). Belum ada demo hosted — project ini local-dev-only sampai langkah ⑥ kelar.

### Pipeline di Balik Project Ini

Setiap fitur dibangun lewat pipeline 5 agent (`/ship [fitur]`), artefak di [`.pipeline/`](./.pipeline):

| Agent | Peran |
|-------|------|
| `planner` | Mengubah permintaan fitur menjadi spec teknis |
| `designer` | Spec desain — dipandu skill `premium-design` bawaan |
| `coder` | Menulis kode dari spec + desain |
| `tester` | Menjalankan dan memeriksa hasil |
| `reviewer` | Vonis akhir — SHIP / NEEDS WORK / BLOCK |

Lihat [CLAUDE.md](./CLAUDE.md) untuk konvensi dan alur lengkapnya.

### Kredit

**Produk & arahan**
- Redho Ramadhani — [linkedin.com/in/redhoramadhanihamid](https://id.linkedin.com/in/redhoramadhanihamid) · [github.com/redhoram](https://github.com/redhoram)

**Dibangun oleh**
- [Claude Code](https://claude.com/claude-code) (Anthropic) menjalankan pipeline 5-agent `/ship`

Setiap commit membawa trailer `Co-Authored-By` — dibangun bersama AI, dimiliki manusianya.

### Lisensi

[GNU AGPL-3.0](LICENSE) — gratis dan open source. Silakan pakai untuk apa saja, termasuk untuk bisnis Anda. Jika Anda memodifikasi lalu mengedarkannya, atau menjalankan versi modifikasi sebagai layanan, perubahan Anda wajib tetap open source. Mohon biarkan [`NOTICE.md`](NOTICE.md) utuh sebagai atribusi.
