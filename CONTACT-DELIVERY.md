# NoticeKit Contact Delivery

Date: 2026-04-21

## Current Status

`/api/contact` is live on Vercel and accepts audit, access, partner, and waitlist intake submissions. Submissions are validated, assigned a `referenceId`, stored in a private Vercel Blob inbox, and forwarded to the configured webhook or email relay.

The public mailbox alias `hello@noticekit.tech` is live and can receive and send replies. `RESEND_API_KEY` is configured in Vercel production and the domain is verified in Resend, so direct email delivery can use Resend when webhook delivery is not selected. Delivery is durable even without a CRM because the validated submission is persisted to a private Blob object before any forwarding happens.

An authenticated internal webhook receiver is configured in `api/contact-webhook.js`, and the Vercel project has `CONTACT_WEBHOOK_URL` and `CONTACT_WEBHOOK_SECRET` entries pointing `/api/contact` at that target. The production endpoint has been verified end-to-end against the private inbox.

## Live Endpoint

- Form page: `https://noticekit.tech/audit-request.html`
- API route: `https://noticekit.tech/api/contact`
- Inbox route: `https://noticekit.tech/api/contact-inbox`
- Source files: `api/contact.js`, `api/contact-inbox.js`, `ops-contact-inbox.html`

The endpoint accepts `POST` JSON only. `GET` and other methods intentionally return `405`.

## Accepted Payload

Required:

- `company`
- `email`

Optional:

- `type`
- `subprocessorUrl`
- `vendorChange`
- `deadline`
- `reviewNeed`
- `website`

`website` is the honeypot field. If it has a value, the endpoint returns a quiet success and does not process the submission.

## Webhook Forwarding

When a webhook delivery target exists, set these Vercel environment variables:

- `CONTACT_WEBHOOK_URL`: HTTPS endpoint that should receive each validated submission.
- `CONTACT_WEBHOOK_SECRET`: Optional bearer token sent as the `Authorization` header.

The forwarded JSON includes the cleaned form fields, selected `type`, `submittedAt`, and `userAgent`.
It also includes `referenceId`, which is returned to the requester and should be used to reconcile Stripe buyers, audit intake forms, Vercel logs, and webhook deliveries.

Internal webhook receiver:

- `CONTACT_WEBHOOK_URL`: `https://noticekit.tech/api/contact-webhook`
- `CONTACT_WEBHOOK_SECRET`: Shared bearer token required by the receiver

The receiver persists each forwarded submission to a separate private Blob prefix so there is a durable record of both the original intake and the forwarded delivery event.

Example Vercel commands:

```bash
npx vercel env add CONTACT_WEBHOOK_URL production
npx vercel env add CONTACT_WEBHOOK_SECRET production
npx vercel --prod
```

Do not commit webhook URLs, secrets, mailbox passwords, API keys, or CRM tokens to the repository.

## Email Relay

If the goal is to notify `hello@noticekit.tech` directly from `/api/contact`, configure either Resend or SMTP:

- `CONTACT_NOTIFICATION_EMAIL`: Optional notification recipient, defaults to `hello@noticekit.tech`.
- `RESEND_API_KEY` or `CONTACT_RESEND_API_KEY`: Resend API key with email send access.
- `CONTACT_RESEND_FROM`: Optional sender like `NoticeKit <hello@noticekit.tech>`.
- `CONTACT_SMTP_URL`: Optional full SMTP connection string for the mailbox provider or relay.
- `CONTACT_SMTP_HOST`: SMTP host, used when `CONTACT_SMTP_URL` is not set.
- `CONTACT_SMTP_PORT`: SMTP port, defaults to `587`.
- `CONTACT_SMTP_SECURE`: Set to `true` for implicit TLS.
- `CONTACT_SMTP_USER`: SMTP username.
- `CONTACT_SMTP_PASSWORD`: SMTP password.
- `CONTACT_SMTP_FROM`: Optional sender like `NoticeKit <hello@noticekit.tech>`.

NoticeKit's DNS currently publishes `_submission._tcp.noticekit.tech` as an SMTP submission target at `smtp-auth.mailprotect.be:587`. A live probe confirms the relay advertises `AUTH PLAIN LOGIN`; SMTP can still be used later if mailbox credentials are provided, but the approved outbound API path is currently Resend.

The endpoint will send a plain-text and HTML copy of each validated submission to the configured notification email. The `Reply-To` header is set to the submitter's email so the operator can reply directly.

Example Vercel commands:

```bash
npx vercel env add CONTACT_NOTIFICATION_EMAIL production
npx vercel env add CONTACT_SMTP_URL production
npx vercel env add CONTACT_SMTP_FROM production
npx vercel --prod
```

## Verification

After configuring a delivery target:

1. Submit a valid test request from `https://noticekit.tech/audit-request.html`.
2. Confirm the API returns HTTP 200 with `Your audit intake was received.`
3. Confirm the target system receives the same reference ID, company, reply email, vendor change, deadline, and review need.
4. Submit an invalid email and confirm HTTP 422.
5. Submit a `GET` request and confirm HTTP 405.

## Fallback

When an email relay is not configured, intake submissions are still recoverable from the private Blob inbox and forwarded through the internal webhook receiver. That is acceptable for the earliest manual validation phase; before paid audit volume increases, direct mailbox or CRM notifications should still be added if the operator needs alerts outside the private inbox.

## Mailbox Handoff

Now that `HELP-STATUS.md` confirms `hello@noticekit.tech` exists:

1. Keep the alias published on `purchase-next-steps.html` and any buyer-facing support copy.
2. Use the private Blob inbox at `ops-contact-inbox.html` for review when no email relay is needed.
3. If the mailbox should receive direct notifications, wire the mailbox relay through `CONTACT_SMTP_URL`, `RESEND_API_KEY`, or `CONTACT_RESEND_API_KEY`.
4. Start validation outreach from the approved sender account using `VALIDATION-OUTREACH-SEND-RUNBOOK.md`.
