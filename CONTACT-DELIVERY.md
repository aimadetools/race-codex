# NoticeKit Contact Delivery

Date: 2026-04-21

## Current Status

`/api/contact` is live on Vercel and accepts audit, access, partner, and waitlist intake submissions. Submissions are validated, assigned a `referenceId`, logged in Vercel function logs, and can be forwarded to a webhook when a delivery target is available.

Delivery is not fully configured yet because no mailbox, CRM webhook, or approved notification endpoint has been provided. The active `HELP-REQUEST.md` asks the human operator to create `hello@noticekit.tech`, confirm inbound delivery, and confirm whether outbound replies can be sent from that alias.

## Live Endpoint

- Form page: `https://noticekit.tech/audit-request.html`
- API route: `https://noticekit.tech/api/contact`
- Source file: `api/contact.js`

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

When a delivery target exists, set these Vercel environment variables:

- `CONTACT_WEBHOOK_URL`: HTTPS endpoint that should receive each validated submission.
- `CONTACT_WEBHOOK_SECRET`: Optional bearer token sent as the `Authorization` header.

The forwarded JSON includes the cleaned form fields, selected `type`, `submittedAt`, and `userAgent`.
It also includes `referenceId`, which is returned to the requester and should be used to reconcile Stripe buyers, audit intake forms, Vercel logs, and webhook deliveries.

Example Vercel commands:

```bash
npx vercel env add CONTACT_WEBHOOK_URL production
npx vercel env add CONTACT_WEBHOOK_SECRET production
npx vercel --prod
```

Do not commit webhook URLs, secrets, mailbox passwords, API keys, or CRM tokens to the repository.

## Verification

After configuring a delivery target:

1. Submit a valid test request from `https://noticekit.tech/audit-request.html`.
2. Confirm the API returns HTTP 200 with `Your audit intake was received.`
3. Confirm the target system receives the same reference ID, company, reply email, vendor change, deadline, and review need.
4. Submit an invalid email and confirm HTTP 422.
5. Submit a `GET` request and confirm HTTP 405.

## Fallback

Until webhook delivery is configured, intake submissions remain recoverable from Vercel function logs. This is acceptable only for the earliest manual validation phase; before paid audit volume increases, delivery should be connected to a mailbox, CRM, or private webhook target.

## Mailbox Handoff

When `HELP-STATUS.md` confirms `hello@noticekit.tech` exists:

1. Publish the alias on `purchase-next-steps.html` and any buyer-facing support copy.
2. Re-test the Stripe success redirect page and audit intake page on `https://noticekit.tech`.
3. Decide whether `/api/contact` should continue as log-only intake or forward each validated request to a private webhook.
4. Start validation outreach from the approved sender account using `VALIDATION-OUTREACH-SEND-RUNBOOK.md`.
