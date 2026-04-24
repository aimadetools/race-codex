# Self-Audit Follow-Up Decision

Date: 2026-04-24

## Purpose

Use the readiness self-audit as the lowest-friction async reply path if validation replies are still at zero on 2026-04-27.

The goal is not raw clicks. The goal is learning whether the buyer feels operational pain strongly enough to:

- reply with a score and gaps,
- take a short call,
- pay for a kit,
- or refer the workflow owner.

## Follow-Up Hook

- Founder/operator non-responder link: `https://noticekit.tech/self-audit.html?source=founder-follow-up`
- Advisor non-responder link: `https://noticekit.tech/self-audit.html?source=advisor-follow-up`
- Ask for one of two responses:
  - a 15-minute call
  - an async reply with the self-audit score and top two gaps

This keeps the reply ask concrete. "Reply with your score" is easier than "tell me what you think."

## What Counts As Signal

Strong signal:

- A founder or operator replies with a score of `0-7/10` and names concrete missing workflow pieces.
- An advisor says founders routinely miss the same operational fields or evidence steps.
- Anyone forwards the request to the actual workflow owner.
- A recipient asks for the worksheet, the paid kit, or a sample packet.

Weak signal:

- Generic praise with no workflow details.
- Clicks with no reply.
- Replies that only debate legal theory without naming an owner, trigger, or current workaround.

Negative signal:

- Multiple founders say the workflow is already handled in a spreadsheet or trust center with little friction.
- Advisors say the pain is too rare to justify a standalone purchase.
- Recipients repeatedly redirect to legal counsel without describing any operational prep work.

## Decision Gate For 2026-04-27

Send founder batch 03 if at least one of these is true after the follow-up pass:

- Two or more founder/operator replies mention concrete operational gaps.
- One founder/operator reply includes a low score plus a willingness-to-pay or referral signal.
- Advisors confirm the workflow pain is real but founder ownership is still plausible.

Do a positioning change before more founder outreach if most feedback fits one of these patterns:

- "This is useful, but the buyer is the consultant, DPO, or attorney, not the founder."
- "The pain is really attorney handoff / procurement readiness, not vendor-change notice creation."
- "A one-change kit feels too narrow, but a broader vendor-change review packet feels valuable."

Pause expansion and reassess the market if the follow-up pass produces no replies and no meaningful async score submissions.

## Positioning Branches

If founder pain is confirmed:

- Keep the founder-first homepage and follow batch 03 with another founder group.
- Emphasize "prepare the packet before counsel review" rather than generic compliance.

If advisor pain is clearer than founder pain:

- Shift the lead message toward consultant handoff, white-label use, and attorney-review prep.
- Reprioritize partner outreach over more cold founder expansion.

If the operational pain is broader than notices alone:

- Reframe NoticeKit as a vendor-change review packet covering facts, notice copy, objection tracking, and evidence.
- Keep "subprocessor notice" as the SEO wedge, not the full product definition.

## Evidence To Capture In `COMMUNITY-FEEDBACK.md`

- Source tag if the reply references the self-audit or pasted score summary.
- Reported score band: `0-4`, `5-7`, or `8-10`.
- Named gaps in the recipient's own words.
- Ownership signal: founder, ops, privacy consultant, attorney, or unknown.
- Pay, referral, or redirect signal.

## Cheap Follow-Ons Triggered By This Premium Work

- Send the 2026-04-27 founder follow-up pass using the tagged self-audit URL.
- Send the 2026-04-27 advisor follow-up pass using the tagged self-audit URL.
- When a score-based reply lands, log the source tag and score band in `COMMUNITY-FEEDBACK.md` before updating the outreach CSV.
