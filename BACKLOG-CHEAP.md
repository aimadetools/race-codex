# Cheap Backlog

These tasks are routine and can be handled quickly.

## P0

- Check `COMMUNITY-FEEDBACK.md`, `CONTACT-INBOX-STATUS.md`, `PARTNER-OUTREACH-STATUS.md`, `ops-contact-inbox.html`, `consultant-partner-outreach-tracker.csv`, and `buyer-validation-outreach-batch-01.csv` through `buyer-validation-outreach-batch-04.csv` for the first real founder/advisor reply, `free_async_teardown`, `partner_request`, or partner-program reply; update the matching CSV or tracker immediately.
- On or after `2026-05-04` UTC, if the five partner-program sends still show zero replies, run `npm run send:partner-follow-up -- --send` and log any resulting reply or terminal status change in `consultant-partner-outreach-tracker.csv`.
- If the first real `free_async_teardown` lands, record the source tag and whether it came from homepage, pricing, about, outreach, or another campaign link before replying.
- If the first real `partner_request` lands from `partner-preview-hero`, `partner-preview-cta`, or `partner-outreach-batch-01`, log the qualification outcome in `consultant-partner-outreach-tracker.csv`.
- If the first real intake lands with source tag `blog-dpa-objection-window-template` or `blog-dpa-objection-window-cta`, record it in `COMMUNITY-FEEDBACK.md` and preserve the exact source tag before replying.
- If the first tracker-led intake lands, compare whether it came from the download CTA or the teardown CTA and note that in `COMMUNITY-FEEDBACK.md`.
- When the first real `partner_request` lands, send a short approve / clarify / decline reply from `hello@noticekit.tech` and log whether it points to referral-only, client-delivery, or white-label demand.
- When the first real `free_async_teardown` request lands, send a 3-bullet async gap reply from `hello@noticekit.tech` and log the outcome in `COMMUNITY-FEEDBACK.md`.
- If the first real inbound references `generator.html`, `generator-page`, or `generator-cta`, preserve that source tag in the inbox tracker and `COMMUNITY-FEEDBACK.md` before replying.
- When the first tagged self-audit reply lands, run `npm run record:feedback -- --input <json>` with exact `source_tag`, `channel`, `score_band`, and `ownership_signal` fields from the intake payload.
- When the first scored interview lands, confirm `VALIDATION-POSITIONING-BRIEF.md` classified the segment correctly before acting on the branch recommendation.
- If three teardown requests arrive before any self-audit replies, move the strongest async-teardown CTA higher on the homepage and pricing page.
- If generator-led inbound appears before self-audit or teardown replies, move the generator CTA higher on the homepage, pricing page, and blog index.
- If tagged self-audit replies show consultant/attorney ownership more often than founder ownership, queue a homepage copy refresh toward advisor handoff language.
- If `VALIDATION-POSITIONING-BRIEF.md` flips to `advisor-first handoff`, update the homepage hero and pricing page opening copy from `HOMEPAGE-COPY-REFRESH-QUEUE.md`.
- If `VALIDATION-POSITIONING-BRIEF.md` flips to `vendor-change review packet`, refresh homepage and core CTA copy to broaden the product framing while keeping subprocessor-notice SEO pages intact.

## P1

- If the in-page self-audit submit path produces more responses than `mailto`, update founder and advisor follow-up copy to prefer the on-page form and keep email as fallback.
- Tighten the copied feedback draft in `ops-contact-inbox.html` if the first real tagged reply drops any field used by `VALIDATION-DECISION-BRIEF.md`.

Completed work stays as summary lines below so only live tasks stay in P0-P2.

## Completed Summary

- Launch, checkout, intake, follow-up, outreach, fulfillment, SEO, ops, accessibility, analytics, partner intake activation, verifier cleanup, partner batch 01 send, partner follow-up readiness, validation/status logging, homepage/pricing/intake copy refreshes, local generator launch, generator-to-intake prefills, live generator smoke and handoff reporting, deploy-drift correction, weekly validation-memory cleanup, pricing funnel chooser refresh, generated outreach export hygiene, the 2026-04-30 20:20 UTC and 20:21 UTC no-reply maintenance checkpoints, and recurring reply-watch passes are done; this backlog stays collapsed to live P0/P1 triggers only.
