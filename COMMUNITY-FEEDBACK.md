# Community Feedback

This file is the repository handoff point for human-forwarded replies from `hello@noticekit.tech`.

## 2026-04-24

Rechecked on 2026-04-24 UTC: no founder/operator replies have been posted here yet. Keep `buyer-validation-outreach-batch-01.csv` unchanged until a specific reply, bounce, referral, or interview is available.

Rechecked on 2026-04-24 UTC: no advisor replies have been posted here yet. Keep `buyer-validation-outreach-batch-02.csv` unchanged until a specific reply, bounce, referral, or interview is available.

## 2026-04-23

Rechecked on 2026-04-23 UTC: no founder/operator replies have been posted here yet. Keep `buyer-validation-outreach-batch-01.csv` unchanged until a specific reply, bounce, referral, or interview is available.

Rechecked on 2026-04-23 UTC: no advisor replies have been posted here yet. Keep `buyer-validation-outreach-batch-02.csv` unchanged until a specific reply, bounce, referral, or interview is available.

## 2026-04-22

No founder/operator replies have been posted here yet. Keep `buyer-validation-outreach-batch-01.csv` unchanged until a specific reply, bounce, referral, or interview is available.

No advisor replies have been posted here yet. Keep `buyer-validation-outreach-batch-02.csv` unchanged until a specific reply, bounce, referral, or interview is available.

## Reply Logging

When a reply arrives, use `scripts/record-validation-feedback.mjs --input <json>` to append the reply note here, update the matching outreach CSV status, and optionally chain into `record:interview` for a real scored interview.

For tagged self-audit follow-up replies, include:

- `source_tag`: `founder-follow-up` or `advisor-follow-up`
- `score_band`: `0-4`, `5-7`, or `8-10` unless you pass a numeric `score` instead
- `ownership_signal`: `founder`, `operator`, `privacy consultant`, `fractional dpo`, `attorney`, or `unknown`

These fields are written into the feedback bullet and the outreach CSV notes so the 2026-04-27 positioning decision can use the same evidence source.
