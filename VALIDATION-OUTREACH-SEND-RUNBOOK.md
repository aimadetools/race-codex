# NoticeKit Validation Outreach Send Runbook

Date: 2026-04-21

## Purpose

Use this runbook to execute the prepared buyer validation outreach batches without changing the scoring rules or overstating validation.

Prepared batches:

- `BUYER-VALIDATION-OUTREACH-BATCH-01.md` and `buyer-validation-outreach-batch-01.csv` for five founder/operator targets.
- `BUYER-VALIDATION-OUTREACH-BATCH-02.md` and `buyer-validation-outreach-batch-02.csv` for three fractional DPO/privacy consultant targets and two startup attorney targets.

## Current Status

The mailbox alias `hello@noticekit.tech` is live, Stripe checkout is live, and the `https://noticekit.tech` domain is live. The Vercel `/api/contact` endpoint is live for audit intake. Production env includes `RESEND_API_KEY`, and the sender domain is verified in Resend, so Codex can send direct validation emails through Resend.

Founder/operator batch 01 was completed on 2026-04-22: four targets were reached through public contact forms, and the remaining EF Loads direct-email target was sent through Resend from `NoticeKit <hello@noticekit.tech>`.

Advisor batch 02 was also completed on 2026-04-22 under an explicit operator override to the sequencing hold. The next active validation task is reply monitoring and interview conversion, with batch 03 reserved for the 2026-04-27 no-reply check.

Use `scripts/send-validation-batch.mjs` to print the ready queue or send approved future batches through SMTP or Resend:

```bash
node scripts/send-validation-batch.mjs --batch 01 --limit 5
node scripts/send-validation-batch.mjs --batch 01 --limit 5 --send --transport smtp
node scripts/send-validation-batch.mjs --batch 01 --limit 5 --send --transport resend
node scripts/send-validation-batch.mjs --batch 03 --limit 5 --transport resend
node scripts/send-validation-batch.mjs --batch 03 --limit 5 --send --transport resend
```

When `--send` succeeds for direct-email rows, the script marks those rows `sent` in the matching CSV and appends the UTC send timestamp plus route to `notes`. Use `--no-update-csv` only for a deliberate one-off send where status will be recorded manually.

The sender enforces the current first-touch date gates: batch 02 cannot be sent before 2026-04-23 UTC, and contingency batch 03 cannot be sent before the 2026-04-27 no-reply check. Use `--force-date` only after a documented operator override.

Use `--follow-up` for the three-business-day non-responder pass:

```bash
node scripts/send-validation-batch.mjs --batch 01 --follow-up --limit 5 --transport resend
node scripts/send-validation-batch.mjs --batch 01 --follow-up --limit 5 --send --transport resend
node scripts/send-validation-batch.mjs --batch 02 --follow-up --limit 5 --transport resend
node scripts/send-validation-batch.mjs --batch 02 --follow-up --limit 5 --send --transport resend
```

Follow-up mode selects only rows still marked `sent`, refuses to send before three business days have elapsed from the first send date in `notes`, and marks successful direct-email rows `followed_up`. Use `--force-date` only after a documented operator override.

## Send Prerequisites

Before sending the first message, confirm all of the following:

- `HELP-STATUS.md` says `hello@noticekit.tech` has been created and can send and receive replies.
- `https://noticekit.tech/pricing.html` shows live Stripe checkout links.
- `https://noticekit.tech/audit-request.html` loads and posts to `/api/contact`.
- `buyer-validation-interview-log.csv` is still empty except for completed interview rows.
- A sending account, SMTP relay, or approved connector is available for Codex to send the batch. Current approved direct-email path: `RESEND_API_KEY` in Vercel production env.

## Batch Order

1. Founder/operator outreach from batch 01 has been sent.
2. Wait at least one business day before sending advisor outreach from batch 02, unless an explicit operator override already handled it.
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

Use `scripts/append-validation-interview.mjs --input <json>` to append a scored interview row once a real reply or call is available. The helper computes the total score and validation-positive flag from the rubric so the log stays consistent.

Use `scripts/record-validation-feedback.mjs --input <json>` to log the reply in `COMMUNITY-FEEDBACK.md`, update the matching outreach CSV status, and optionally chain into `scripts/append-validation-interview.mjs` when the reply turns into a real interview.

## First-Day Execution

Batch 01 and batch 02 are already executed. Next actions are reply monitoring, one polite follow-up after three business days for non-responders, and interview conversion for any real replies.
If no founder/operator replies have arrived by 2026-04-27, use `buyer-validation-outreach-batch-03.csv` and the matching drafts in `validation-outreach-drafts/` as the next five-target founder expansion.
The sender enforces the batch 03 hold for live sends before 2026-04-27 UTC, but dry-runs remain available for route checks.
The prepared founder follow-up queue lives in `BUYER-VALIDATION-FOUNDER-FOLLOW-UP-PASS.md`, and `node scripts/build-founder-follow-up-pass.mjs` can regenerate it from batch 01 when the queue changes.
The prepared advisor follow-up queue lives in `BUYER-VALIDATION-ADVISOR-FOLLOW-UP-PASS.md`, and `node scripts/build-advisor-follow-up-pass.mjs` can regenerate it from batch 02 when the queue changes.
Use `node scripts/send-validation-batch.mjs --batch 01 --follow-up --limit 5 --transport resend` and `node scripts/send-validation-batch.mjs --batch 02 --follow-up --limit 5 --transport resend` to dry-run the exact due follow-up queues before sending them.

## Reply-to-Interview Scheduling

When a recipient replies with interest, keep the response short and move to a concrete slot request:

```text
Thanks for the quick reply. Would either [day/time option 1] or [day/time option 2] work for a 15-minute feedback call?

I will keep it focused on how you handle subprocessor/vendor-change notices today, what facts are usually missing, and whether a lightweight operational packet would save time or create risk. No confidential client details or legal review needed.
```

If the reply is async-only, send the six interview questions from `BUYER-VALIDATION-PACKET.md` and record the answers only after they include concrete workflow details.

## Batch 02 Send Procedure

Advisor batch 02 can be sent after the one-business-day hold from founder/operator batch 01, no earlier than 2026-04-23.
The sender script enforces this date for `--batch 02 --send`; `--force-date` is reserved for a documented human override.

Dry-run the full queue first:

```bash
node scripts/send-validation-batch.mjs --batch 02 --limit 5 --transport resend
```

Expected routing:

- Bamboo Data Consulting: direct email through Resend to `info@bamboodc.com`.
- Privageo: manual contact form at `https://privageo.com/contact-us/`.
- ATOM: direct email through Resend to `info@theatomgroup.com`.
- Coto & Waddington: direct email through Resend to `contact@cotowaddington.com`.
- Altum Legal: direct email through Resend to `info@altumlegal.com`.

After the direct emails are sent, confirm `buyer-validation-outreach-batch-02.csv` has the four direct-email rows marked `sent`. After the Privageo form is submitted, manually update its row from `ready_for_send` to `sent` with the exact UTC send timestamp and form route.

## Validation Gate

After five founder/operator interviews and five advisor interviews, apply the decision gate in `BUYER-VALIDATION-PACKET.md`.

Continue only if at least three interviews are validation-positive, including at least two founder/operator interviews. Otherwise, revise the offer, price, or buyer segment before more build work.
