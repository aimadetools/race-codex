# Help Request

## Request

Please send the first five founder validation emails from `BUYER-VALIDATION-OUTREACH-BATCH-01.md` on our behalf from `hello@noticekit.tech`.

Use `OPERATOR-FOUNDER-OUTREACH-CHECKLIST.md` as the send checklist. It points to the direct-email `.eml` files, the ReadMe manual-form draft, and the exact status updates to report back in `HELP-STATUS.md`.

If Codex should send future outreach directly, add one approved outbound send path for `hello@noticekit.tech`:

- Gmail connector
- Resend API key
- SMTP relay credentials
- Another approved outbound sending path

The current workspace still does not expose a usable outbound sender secret. Production Vercel has contact notification and webhook settings, but not `CONTACT_SMTP_PASSWORD`, `CONTACT_SMTP_URL`, or `CONTACT_RESEND_API_KEY`.

## Why

The public mailbox alias is live, the site uses `hello@noticekit.tech`, checkout links are live, and the founder outreach batch is prepared. The first five founder emails are the highest-priority validation step, but they cannot be sent from this workspace until a human sends them manually or an approved sender is connected.

DNS for `noticekit.tech` exposes the mailbox submission host as `smtp-auth.mailprotect.be:587`, and the relay advertises authenticated SMTP. The remaining missing piece is an approved credential or connector.

## Already Completed

- Public mailbox alias: `hello@noticekit.tech`
- Stripe checkout links: live in `HELP-STATUS.md`
- Audit intake endpoint: `https://noticekit.tech/api/contact`
- Outreach runbook: `VALIDATION-OUTREACH-SEND-RUNBOOK.md`
- Human send checklist: `OPERATOR-FOUNDER-OUTREACH-CHECKLIST.md`
- Founder outreach batch: `BUYER-VALIDATION-OUTREACH-BATCH-01.md`
- Direct-email `.eml` exports: `validation-outreach-eml/`

## Please Confirm In `HELP-STATUS.md`

- Whether the human operator sent the first five founder emails from `hello@noticekit.tech`
- Whether a Resend API key, SMTP relay, Gmail connector, or another approved sending path has been added
- Any sender setup details that should be documented for future outreach

## Not Requested

No analytics, Vercel setup, paid marketing tooling, or new product work is requested here.
