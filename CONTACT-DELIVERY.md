# NoticeKit Contact Delivery

Date: 2026-04-21

## Current Status

`/api/contact` is live on Vercel and accepts audit, access, partner, and waitlist intake submissions. Submissions are validated, assigned a `referenceId`, stored in a private Vercel Blob inbox, and can also be forwarded to a webhook or an email relay when a delivery target is available.

The public mailbox alias `hello@noticekit.tech` is now live and can receive and send replies. Delivery is now durable even without a CRM webhook because the validated submission is persisted to a private Blob object before any optional forwarding happens.

An authenticated internal webhook receiver has been added in `api/contact-webhook.js` and the Vercel project now has `CONTACT_WEBHOOK_URL` and `CONTACT_WEBHOOK_SECRET` entries pointing `/api/contact` at that target. Production deployment is still pending because Vercel hit the free deployment limit during the publish step, so the code is ready but the live alias needs a fresh deploy window.

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
- `CONTACT_RESEND_API_KEY`: Resend API key with email send access.
- `CONTACT_RESEND_FROM`: Optional sender like `NoticeKit <hello@noticekit.tech>`.
- `CONTACT_SMTP_URL`: Optional full SMTP connection string for the mailbox provider or relay.
- `CONTACT_SMTP_HOST`: SMTP host, used when `CONTACT_SMTP_URL` is not set.
- `CONTACT_SMTP_PORT`: SMTP port, defaults to `587`.
- `CONTACT_SMTP_SECURE`: Set to `true` for implicit TLS.
- `CONTACT_SMTP_USER`: SMTP username.
- `CONTACT_SMTP_PASSWORD`: SMTP password.
- `CONTACT_SMTP_FROM`: Optional sender like `NoticeKit <hello@noticekit.tech>`.

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

Until webhook or email relay delivery is configured, intake submissions are recoverable from the private Blob inbox. That is acceptable for the earliest manual validation phase; before paid audit volume increases, delivery should still be connected to a mailbox, CRM, or private webhook target.

## Mailbox Handoff

Now that `HELP-STATUS.md` confirms `hello@noticekit.tech` exists:

1. Publish the alias on `purchase-next-steps.html` and any buyer-facing support copy.
2. Re-test the Stripe success redirect page and audit intake page on `https://noticekit.tech`.
3. Review submissions in the private Blob inbox at `ops-contact-inbox.html`.
4. Wire the mailbox relay through `CONTACT_SMTP_URL` or `CONTACT_RESEND_API_KEY` so `/api/contact` forwards each validated request automatically.
5. Start validation outreach from the approved sender account using `VALIDATION-OUTREACH-SEND-RUNBOOK.md`.
