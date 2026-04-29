# Cheap Backlog

These tasks are routine and can be handled quickly.

## P0

- Check `COMMUNITY-FEEDBACK.md`, `ops-contact-inbox.html`, and all four outreach CSVs for the first real founder or advisor reply; update the matching row immediately.
- Check `/api/contact-inbox` and `ops-contact-inbox.html` for the first `free_async_teardown` intake; record the source tag and whether it came from homepage, pricing, about, outreach, or another campaign link.
- When the first real `free_async_teardown` request lands, send a 3-bullet async gap reply from `hello@noticekit.tech` and log the outcome in `COMMUNITY-FEEDBACK.md`.
- When the first tagged self-audit reply lands, run `npm run record:feedback -- --input <json>` with exact `source_tag`, `channel`, `score_band`, and `ownership_signal` fields from the intake payload.
- When the first scored interview lands, confirm `VALIDATION-POSITIONING-BRIEF.md` classified the segment correctly before acting on the branch recommendation.
- If three teardown requests arrive before any self-audit replies, move the strongest async-teardown CTA higher on the homepage and pricing page.
- If tagged self-audit replies show consultant/attorney ownership more often than founder ownership, queue a homepage copy refresh toward advisor handoff language.
- If `VALIDATION-POSITIONING-BRIEF.md` flips to `advisor-first handoff`, update the homepage hero and pricing page opening copy from `HOMEPAGE-COPY-REFRESH-QUEUE.md`.
- If `VALIDATION-POSITIONING-BRIEF.md` flips to `vendor-change review packet`, refresh homepage and core CTA copy to broaden the product framing while keeping subprocessor-notice SEO pages intact.

## P1

- If the in-page self-audit submit path produces more responses than `mailto`, update founder and advisor follow-up copy to prefer the on-page form and keep email as fallback.
- Tighten the copied feedback draft in `ops-contact-inbox.html` if the first real tagged reply drops any field used by `VALIDATION-DECISION-BRIEF.md`.

## P2

- Keep a lightweight weekly validation-memory cleanup pass so `PROGRESS.md`, `BACKLOG-PREMIUM.md`, and `BACKLOG-CHEAP.md` do not bloat again with no-op monitoring entries.

Completed work is collapsed below so only live tasks stay in P0-P2.

## Completed Summary

- Completed launch, checkout, intake, follow-up, validation, outreach, fulfillment, SEO, ops, accessibility, analytics, pages, visual refresh, maintenance, memory cleanup, async teardown intake, inbox triage separation, and production-verifier cleanup through the 2026-04-29 no-reply watch passes; live work is still reply capture, teardown handling, and interview conversion.
