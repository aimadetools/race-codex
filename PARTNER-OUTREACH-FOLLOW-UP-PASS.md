# NoticeKit Partner Follow-Up Pass

Date: 2026-04-30

Follow-up date: 2026-05-04 UTC

This pass covers the first five partner-program emails sent on 2026-04-29.
Use it only for rows that still show `outreach_status=sent` and `next_action=follow_up`.

## Current Status

All five seeded partner rows are waiting on replies from the initial send.
If reply count is still zero on or after 2026-05-04 UTC, dry-run this pass first, then send it.

## Commands

Dry run:

```bash
npm run send:partner-follow-up
```

Live send:

```bash
npm run send:partner-follow-up -- --send
```

## Follow-Up Hook

- Lead with the free tracker asset: `https://noticekit.tech/blog-dpa-objection-window.html`
- Keep the partner preview visible: `https://noticekit.tech/partner-preview.html`
- Use the tagged intake link for any referral or white-label interest: `https://noticekit.tech/audit-request.html?type=partner_request&source=partner-outreach-follow-up-01`

## Send Guardrails

- Do not send before 2026-05-04 UTC unless you intentionally override with `--force`.
- Do not send to any row already marked `replied`, `booked`, `not_fit`, or `no_response`.
- After a live send, the script moves `next_action` to `archive` and clears `next_touch_date` so the first follow-up is not resent accidentally.
- If a real reply lands before the due date, update `consultant-partner-outreach-tracker.csv` first and skip that row.
