# NoticeKit Validation Outreach Send Runbook

Date: 2026-04-21

## Purpose

Use this runbook to execute the prepared buyer validation outreach batches without changing the scoring rules or overstating validation.

Prepared batches:

- `BUYER-VALIDATION-OUTREACH-BATCH-01.md` and `buyer-validation-outreach-batch-01.csv` for five founder/operator targets.
- `BUYER-VALIDATION-OUTREACH-BATCH-02.md` and `buyer-validation-outreach-batch-02.csv` for three fractional DPO/privacy consultant targets and two startup attorney targets.

## Current Status

Do not send yet.

Stripe checkout and the `https://noticekit.tech` domain are live. The Vercel `/api/contact` endpoint is live for audit intake. Public outbound validation outreach is still blocked until the included mailbox is created as `hello@noticekit.tech` or an approved sending account is connected.

## Send Prerequisites

Before sending the first message, confirm all of the following:

- `HELP-STATUS.md` says `hello@noticekit.tech` has been created.
- The sender can receive replies to `hello@noticekit.tech`.
- `https://noticekit.tech/pricing.html` shows live Stripe checkout links.
- `https://noticekit.tech/audit-request.html` loads and posts to `/api/contact`.
- `buyer-validation-interview-log.csv` is still empty except for completed interview rows.

## Batch Order

1. Send founder/operator outreach from batch 01 first.
2. Wait at least one business day before sending advisor outreach from batch 02.
3. Send no more than five cold validation emails per day from a newly created mailbox.
4. Send one follow-up after three business days if there is no response.
5. Stop outreach to any recipient who declines, unsubscribes, or redirects the request.

## Message Rules

- Use the exact templates from the batch files unless personalizing the first sentence with a public source signal.
- Keep the non-legal-advice language in every first-touch email.
- Do not claim customers, revenue, adoption, benchmark findings, or attorney approval.
- Do not attach files in the first email.
- Include `https://noticekit.tech/pricing.html` only if the recipient asks what NoticeKit costs or whether it is available.
- Include `https://noticekit.tech/audit-request.html` only after a recipient asks to share details for review.

## Tracking Rules

Update the CSV row status after each action:

- `sent`: first email sent.
- `follow_up_scheduled`: first email sent and follow-up date selected.
- `followed_up`: follow-up sent.
- `replied_positive`: recipient agreed to a call, referral, or concrete feedback.
- `replied_negative`: recipient declined or said the problem is not relevant.
- `bounced`: message bounced or contact path failed.
- `interview_completed`: interview happened and the scoring log was updated.

Only add rows to `buyer-validation-interview-log.csv` after an actual call, async interview response, or specific referral. Do not score silence, opens, clicks, or generic replies.

## First-Day Execution

When the mailbox is live, send these first:

1. ReadMe founder/operator email from batch 01.
2. EF Loads founder/operator email from batch 01.
3. BMBerry founder/operator email from batch 01.

Hold the remaining two founder emails for the next business day unless replies are already coming in cleanly.

## Validation Gate

After five founder/operator interviews and five advisor interviews, apply the decision gate in `BUYER-VALIDATION-PACKET.md`.

Continue only if at least three interviews are validation-positive, including at least two founder/operator interviews. Otherwise, revise the offer, price, or buyer segment before more build work.
