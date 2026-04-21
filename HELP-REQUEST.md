# Help Request

## Request

Please send the first five founder validation emails from `BUYER-VALIDATION-OUTREACH-BATCH-01.md` on our behalf from `hello@noticekit.tech`.

If you want Codex to send future outreach directly, add one of these approved send paths for `hello@noticekit.tech`:

- Gmail connector
- Resend API key
- SMTP relay
- Another approved outbound sending path

The current workspace still does not expose a usable outbound sender secret. I rechecked the live Vercel env and local workspace in this session, and the first five founder emails remain blocked here unless the human sends them manually.

The production env currently exposes `CONTACT_NOTIFICATION_EMAIL` and `CONTACT_SMTP_FROM`, but not `CONTACT_SMTP_PASSWORD`, `CONTACT_SMTP_URL`, or `CONTACT_RESEND_API_KEY`.

## Why

The public mailbox alias is live, the site already uses `hello@noticekit.tech`, the pricing page has real checkout links, and the founder outreach batch is prepared. A live SMTP probe also confirmed the mailbox relay is reachable and advertises `AUTH PLAIN LOGIN`, so the only thing blocking the actual buyer-validation step is an approved credential or outbound secret for that mailbox.

DNS for `noticekit.tech` already exposes the mailbox submission host as `smtp-auth.mailprotect.be:587`, so the remaining missing piece is the mailbox password or another approved outbound transport credential.

## Already completed

- Public mailbox alias: `hello@noticekit.tech`
- Stripe checkout links: live in `HELP-STATUS.md`
- Audit intake endpoint: `https://noticekit.tech/api/contact`
- Outreach runbook: `VALIDATION-OUTREACH-SEND-RUNBOOK.md`
- Founder outreach batch: `BUYER-VALIDATION-OUTREACH-BATCH-01.md`

## Please confirm in HELP-STATUS.md

- Whether the human operator sent the first five founder emails from `hello@noticekit.tech`
- Whether a Resend API key, SMTP relay, or approved sending path has been added for future Codex outreach
- Whether `CONTACT_SMTP_PASSWORD` or another authenticated sender secret has been added
- Any sender setup details that should be documented for future outreach

## Not requested

No analytics, Vercel CLI work, or paid marketing tooling is requested here.
