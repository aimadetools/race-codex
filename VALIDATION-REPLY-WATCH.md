# Validation Reply Watch

- Founder/operator batch 01 replies, bounces, or interview rows recorded in CSV: 0
- Advisor batch 02 replies, bounces, or interview rows recorded in CSV: 0
- Contingency batch 03 replies, bounces, or interview rows recorded in CSV: 0
- Contingency batch 04 replies, bounces, or interview rows recorded in CSV: 0
- Interview log rows: 0
- Founder/operator batch 01 sent or followed-up rows still waiting for replies: 5
- Advisor batch 02 sent or followed-up rows still waiting for replies: 5
- Contingency batch 03 sent or followed-up rows still waiting for replies: 0
- Contingency batch 04 sent or followed-up rows still waiting for replies: 0
- Community feedback note: no founder/operator or advisor replies have been posted yet.
- Founder follow-up pass due: 2026-04-27 UTC
- Advisor follow-up pass due: 2026-04-27 UTC

## Next Action

- Keep monitoring `COMMUNITY-FEEDBACK.md` until the follow-up window opens.

## Upcoming Queue

- Before the next due follow-up window, keep `SELF-AUDIT-FOLLOW-UP-QA.md` current with `npm run check:self-audit-follow-up`.
- On 2026-04-27 UTC, dry-run founder follow-ups with `node scripts/send-validation-batch.mjs --batch 01 --follow-up --limit 5 --transport resend`.
- On 2026-04-27 UTC, send founder follow-ups with `node scripts/send-validation-batch.mjs --batch 01 --follow-up --limit 5 --send --transport resend` if replies are still zero.
- On 2026-04-27 UTC, dry-run advisor follow-ups with `node scripts/send-validation-batch.mjs --batch 02 --follow-up --limit 5 --transport resend`.
- On 2026-04-27 UTC, send advisor follow-ups with `node scripts/send-validation-batch.mjs --batch 02 --follow-up --limit 5 --send --transport resend` if replies are still zero.
- If founder replies are still zero on 2026-04-27 UTC, founder batch 03 unlocks with 5 ready target(s).
- When that gate opens, dry-run founder batch 03 with `node scripts/send-validation-batch.mjs --batch 03 --limit 5 --transport resend`.
- Batch 04 remains a second contingency queue with 5 ready target(s), but only after batch 03 is exhausted and founder replies are still zero.
