# Operator Founder Outreach Checklist

Date: 2026-04-22

## Purpose

This is the shortest path for a human operator to send the first NoticeKit founder validation batch from `hello@noticekit.tech`.

It does not mark outreach as sent. Update the batch CSV only after the emails or form submissions are actually completed.

## Send From

- Mailbox: `hello@noticekit.tech`
- Daily cap: send only these five founder/operator targets for the first batch.
- Attachments: none.
- Product links: do not include pricing or audit links unless the recipient asks.
- Positioning: keep the non-legal-advice line in every message.

## Batch 01 Send Queue

| Priority | Target | Route | Source |
|---:|---|---|---|
| 1 | ReadMe | Use `https://readme.com/pricing` Contact Sales or the docs support widget. | `validation-outreach-drafts/01-readme.md` |
| 2 | EF Loads | Send to `support@efloads.com`; use `legal@efloads.com` only if support bounces or redirects. | `validation-outreach-eml/02-ef-loads.eml` |
| 3 | BMBerry | Send to `support@bmberry.com`. | `validation-outreach-eml/03-bmberry.eml` |
| 4 | RootCause / Bryntum | Send to `dpo@bryntum.com`; use `https://therootcause.io/contact/` only if email fails. | `validation-outreach-eml/04-rootcause-bryntum.eml` |
| 5 | Deployable AI Services | Send to `mbinghelaita@deployableai.ae`. | `validation-outreach-eml/05-deployable-ai-services.eml` |

## Exact Send Steps

1. Open the first direct-email `.eml` file in a mail client that can send from `hello@noticekit.tech`.
2. Confirm the sender is `hello@noticekit.tech` before sending.
3. Send the email without attachments.
4. Repeat for the remaining direct-email `.eml` files.
5. Submit the ReadMe manual-form target using the first-touch copy in `validation-outreach-drafts/01-readme.md`.
6. Record the sent timestamp, route used, and any immediate bounce in `buyer-validation-outreach-batch-01.csv`.

## CSV Status Updates

Use these values in `buyer-validation-outreach-batch-01.csv`:

- `sent` after the first email or form submission succeeds.
- `bounced` if the route fails.
- `replied_positive` only after a call, referral, or specific useful feedback.
- `replied_negative` only after a decline or clear disqualification.
- `interview_completed` only after `buyer-validation-interview-log.csv` has a real scored interview row.

Do not add rows to `buyer-validation-interview-log.csv` for silence, delivery, opens, clicks, or generic acknowledgements.

## After Sending

Update `HELP-STATUS.md` with:

- The date and UTC time the five founder/operator messages were sent.
- The exact route used for each target.
- Any bounces, redirects, or immediate replies.
- Whether Codex should schedule a three-business-day follow-up pass.

After that confirmation exists, Codex can update the batch CSV, schedule follow-ups, and keep advisor outreach queued until founder responses are understood.
