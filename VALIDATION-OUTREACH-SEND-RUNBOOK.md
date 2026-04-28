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

Advisor batch 02 was also completed on 2026-04-22 under an explicit operator override to the sequencing hold. Founder contingency batches 03 and 04 were sent on 2026-04-28 after the no-reply gate opened, so the live validation job is now reply monitoring and interview conversion across all 20 outbound rows.

Use `scripts/send-validation-batch.mjs` to print the ready queue or send approved future batches through SMTP or Resend:

```bash
node scripts/send-validation-batch.mjs --batch 01 --limit 5
node scripts/send-validation-batch.mjs --batch 01 --limit 5 --send --transport smtp
node scripts/send-validation-batch.mjs --batch 01 --limit 5 --send --transport resend
node scripts/send-validation-batch.mjs --batch 03 --limit 5 --transport resend
node scripts/send-validation-batch.mjs --batch 03 --limit 5 --send --transport resend
```

When `--send` succeeds for direct-email rows, the script marks those rows `sent` in the matching CSV and appends the UTC send timestamp plus route to `notes`. Use `--no-update-csv` only for a deliberate one-off send where status will be recorded manually.

The sender enforces the current first-touch date gates: batch 02 cannot be sent before 2026-04-23 UTC, and contingency batches 03 and 04 cannot be sent before the 2026-04-27 no-reply check. Batch 04 also stays blocked until batch 03 has no `ready_for_send` rows left and founder/operator reply rows are still zero. Use `--force-date` only after a documented operator override; it does not bypass the batch 04 prerequisite check.

Use `--follow-up` for the three-business-day non-responder pass:

```bash
node scripts/send-validation-batch.mjs --batch 01 --follow-up --limit 5 --transport resend
node scripts/send-validation-batch.mjs --batch 01 --follow-up --limit 5 --send --transport resend
node scripts/send-validation-batch.mjs --batch 02 --follow-up --limit 5 --transport resend
node scripts/send-validation-batch.mjs --batch 02 --follow-up --limit 5 --send --transport resend
```

Follow-up mode selects only rows still marked `sent`, refuses to send before three business days have elapsed from the first send date in `notes`, and marks successful direct-email rows `followed_up`. Use `--force-date` only after a documented operator override.
The generated follow-up pass files prefer the actual inbox recorded in CSV `notes` when the first send already discovered a direct-email route, so re-read those files before the 2026-04-27 window instead of assuming the broader public contact path is still the best follow-up route.
Batch 03 now also refuses to send if founder/operator replies, bounces, or interviews already exist in batch 01, so the contingency expansion cannot accidentally override a real founder signal after the no-reply gate date.
For manual-form sends or follow-ups, use `npm run update:validation-outreach-status -- --batch <id> --company "<name>" --status sent|followed_up --transport manual --route "<form URL or path>" --timestamp "<ISO timestamp>"` instead of hand-editing the CSV; the helper appends the note and syncs the validation artifacts automatically.

Before sending either follow-up pass, run `npm run check:self-audit-follow-up` and confirm `SELF-AUDIT-FOLLOW-UP-QA.md` shows the founder desktop and advisor mobile tagged paths both passing. That keeps the score-summary mailto path and copy-summary fallback verified right before the 2026-04-27 window.

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
3. Founder contingency batches 03 and 04 have also been sent, so do not unlock more cold outreach unless new evidence changes the plan.
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
When the reply came from the tagged self-audit follow-up path, include `source_tag`, `score_band` or `score`, and `ownership_signal` so the feedback log captures the founder-vs-advisor signal before the outreach CSV moves forward.
Use `npm run log:validation-no-reply-check` for a no-reply checkpoint so the current UTC recheck is recorded without hand-editing duplicate founder/advisor notes into `COMMUNITY-FEEDBACK.md`.
Use `npm run run:validation-maintenance` for the routine no-reply monitoring pass. It runs the watch, self-audit QA, artifact sync, and no-reply logger together, and it automatically uses a non-regressive UTC checkpoint if repo memory is temporarily ahead of the local system clock. Same-day future timestamps are clamped back to the current UTC time so a later note from the same calendar date does not make the pass look artificially future-dated.
`record-validation-feedback.mjs`, `append-validation-interview.mjs`, and `send-validation-batch.mjs` now auto-run `npm run sync:validation-artifacts` after any non-dry-run CSV or status update, so the follow-up queues, homepage pivot queue, validation status, and validation watch stay synchronized without a separate rebuild step.
`update-validation-outreach-status.mjs` uses the same sync path for manual-route status changes, so manual contact-form sends and follow-ups do not need a separate rebuild pass.
That sync now also refreshes `VALIDATION-POSITIONING-BRIEF.md` and `VALIDATION-DECISION-BRIEF.md`, so the 2026-04-27 window has both an evidence-backed founder-vs-advisor positioning read and the immediate execution queue for follow-ups, batch 03, batch 04, and homepage-pivot checks.
`VALIDATION-REPLY-WATCH.md` is the checked-in monitoring artifact from that sync; read it first when the goal is only to know whether replies, due follow-ups, or batch-unlock conditions changed, and use the listed commands when the queue opens.

## Tagged Self-Audit Triage

Use `ops-contact-inbox.html` before hand-editing `COMMUNITY-FEEDBACK.md` when a tagged self-audit reply lands:

1. Load the inbox with the ops password and set the filter to `Tagged validation replies only` when the reply came from a founder or advisor follow-up link.
2. Confirm the record shows the expected `source tag`, `submission channel`, `ownership`, `score`, `score band`, and `top gaps` so the async signal is classified before any outreach CSV status changes.
3. Copy the generated `Community feedback draft` line from the record instead of paraphrasing the reply manually.
4. If the reply needs direct follow-up, use the `Reply by email` action or mirror its subject line when answering from `hello@noticekit.tech`.
5. Run `node scripts/record-validation-feedback.mjs --input <json>` with the exact `source_tag`, `score` or `score_band`, and `ownership_signal` from the inbox record so the feedback log, outreach CSV, and derived validation artifacts stay aligned.

If the inbox draft ever drops a field used by `VALIDATION-POSITIONING-BRIEF.md` or `VALIDATION-DECISION-BRIEF.md`, tighten the draft formatter in `ops-contact-inbox.html` before logging more tagged replies.

Example self-audit async reply payload:

```json
{
  "company": "Example SaaS",
  "segment": "Founder/operator",
  "reply_type": "positive",
  "summary": "Founder replied with a low readiness score and named two missing steps.",
  "details": "We do this in a spreadsheet today. No one owns the objection deadline and evidence folder.",
  "source": "Email reply to hello@noticekit.tech",
  "source_tag": "founder-follow-up",
  "score": 4,
  "ownership_signal": "founder",
  "signal": "async score reply",
  "next_step": "Offer a 15-minute follow-up call."
}
```

## First-Day Execution

Batches 01 through 04 are already executed. Next actions are reply monitoring, one polite follow-up after three business days for non-responders, and interview conversion for any real replies.
Do not treat batch 03 or batch 04 as pending inventory anymore; they are already live outbound and should only move forward through reply, bounce, follow-up, or interview status updates.
The prepared founder follow-up queue lives in `BUYER-VALIDATION-FOUNDER-FOLLOW-UP-PASS.md`, and `node scripts/build-founder-follow-up-pass.mjs` can regenerate it from batch 01 when the queue changes.
The prepared advisor follow-up queue lives in `BUYER-VALIDATION-ADVISOR-FOLLOW-UP-PASS.md`, and `node scripts/build-advisor-follow-up-pass.mjs` can regenerate it from batch 02 when the queue changes.
Use `node scripts/send-validation-batch.mjs --batch 01 --follow-up --limit 5 --transport resend` and `node scripts/send-validation-batch.mjs --batch 02 --follow-up --limit 5 --transport resend` to dry-run the exact due follow-up queues before sending them.
Run `npm run build:validation-decision-brief` or `npm run sync:validation-artifacts` first and read `VALIDATION-DECISION-BRIEF.md` before sending any additional follow-up or making a positioning change.
For the gate-day operational pass, use `npm run run:validation-gate -- --transport resend` to sync artifacts, print the current queue, and dry-run any due follow-ups. Add `--send` to execute the due follow-up batches, add `--include-batch03` when the founder no-reply contingency should be evaluated in the same pass, and add `--include-batch04` only after batch 03 is exhausted and founder replies are still zero.
After any manual-form send or follow-up during that pass, record it immediately with `npm run update:validation-outreach-status -- --batch <id> --company "<name>" --status sent|followed_up --transport manual --route "<form URL or path>" --timestamp "<ISO timestamp>"` so `VALIDATION-REPLY-WATCH.md` and `VALIDATION-STATUS.md` stay current.
Use `npm run sync:validation-artifacts` only when you need to force a rebuild without recording a send, reply, bounce, or interview.
Use `npm run build:validation-watch` when you only need a fresh `VALIDATION-REPLY-WATCH.md` snapshot without rebuilding the rest of the validation artifacts.

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
