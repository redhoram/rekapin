// Transactional email via Resend's REST API (no SDK dependency). When
// RESEND_API_KEY is unset (local dev), emails are logged to the console
// instead so every flow stays testable without an account.

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative for clients that block HTML. */
  text: string;
}

export interface SendEmailResult {
  ok: boolean;
  /** "resend" when actually sent; "console" in the dev fallback. */
  via: "resend" | "console";
  error?: string;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Resend's shared onboarding sender works without domain verification but can
// only deliver to the account owner's own address — set RESEND_FROM to a
// verified-domain sender before real users sign up.
const DEFAULT_FROM = "Rekapin <onboarding@resend.dev>";

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Dev fallback: log enough to complete the flow manually (links included).
    console.log(
      `[dev][email] to=${input.to} subject="${input.subject}"\n${input.text}`,
    );
    return { ok: true, via: "console" };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? DEFAULT_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] Resend ${res.status}: ${body.slice(0, 300)}`);
      return { ok: false, via: "resend", error: `Resend responded ${res.status}` };
    }
    return { ok: true, via: "resend" };
  } catch (err) {
    console.error("[email] Resend request failed:", err);
    return { ok: false, via: "resend", error: "Network error reaching Resend" };
  }
}

/**
 * Shared minimal HTML wrapper for transactional emails. Inline styles only
 * (email clients ignore stylesheets); brand-neutral grayscale + one yellow CTA.
 */
export function emailLayout(opts: {
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
}): string {
  return `<!doctype html>
<html lang="id">
<body style="margin:0;padding:24px;background:#f6f5f2;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e3ddd2;border-radius:8px;padding:32px;">
        <tr><td style="font-size:18px;font-weight:bold;padding-bottom:4px;">Rekapin</td></tr>
        <tr><td style="font-size:16px;font-weight:bold;padding:16px 0 8px;">${opts.title}</td></tr>
        <tr><td style="font-size:14px;line-height:1.6;color:#4a4a4a;">${opts.bodyHtml}</td></tr>
        <tr><td style="padding:24px 0;">
          <a href="${opts.ctaUrl}" style="display:inline-block;background:#F5C518;color:#0A0A0A;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 24px;border-radius:6px;">${opts.ctaLabel}</a>
        </td></tr>
        <tr><td style="font-size:12px;line-height:1.5;color:#8a8a8a;border-top:1px solid #eee9e0;padding-top:16px;">
          ${opts.footerNote}<br>
          Kalau tombol tidak berfungsi, salin tautan ini ke browser:<br>
          <span style="word-break:break-all;color:#4a4a4a;">${opts.ctaUrl}</span>
        </td></tr>
      </table>
      <table role="presentation" width="480" cellpadding="0" cellspacing="0">
        <tr><td style="font-size:11px;color:#a09a90;padding:16px 8px;" align="center">
          Rekapin — laporan keuangan otomatis untuk UMKM · Built by redhoram × Claude Code
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
