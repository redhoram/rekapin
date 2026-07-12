# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately via one of:

- GitHub private vulnerability reporting: **Security → Report a vulnerability** on this repository
- Email: **redhoram@gmail.com** (subject: `[rekapin security]`)

You can expect an acknowledgement within a few days. Please include steps to
reproduce and the potential impact. Coordinated disclosure is appreciated —
give us a reasonable window to ship a fix before publishing details.

## Supported versions

Only the latest code on `main` is supported. There are no maintained release
branches.

## Scope notes for researchers

Rekapin is a multi-tenant financial app. Reports we care most about:

- Cross-tenant data access (anything that leaks data across `business_id`)
- Role-check bypasses (staff reaching admin-only data: reports, dashboard,
  settings, member management)
- Authentication issues (session handling, invite-token misuse)
- File-upload parsing issues (crafted CSV/XLSX causing more than a failed row)

Known hardening items already tracked internally: auth rate limiting uses
better-auth's default in-memory store (per-instance on serverless — a shared
store is planned), and error monitoring is not yet wired.
