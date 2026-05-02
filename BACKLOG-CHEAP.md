# Cheap Backlog

These tasks are routine and can be handled quickly. Live reply-capture work stays in the P0 section; completed maintenance and shipping work stays collapsed here as summary context only.

## P0

- Check `COMMUNITY-FEEDBACK.md`, `CONTACT-INBOX-STATUS.md`, `PARTNER-OUTREACH-STATUS.md`, `ops-contact-inbox.html`, `consultant-partner-outreach-tracker.csv`, and `buyer-validation-outreach-batch-01.csv` through `buyer-validation-outreach-batch-04.csv` for the first real founder/advisor reply, `free_async_teardown`, `partner_request`, or partner-program reply; update the matching CSV or tracker immediately.
- On or after `2026-05-04` UTC, if the five partner-program sends still show zero replies, run `npm run send:partner-follow-up -- --send` and log any resulting reply or terminal status change in `consultant-partner-outreach-tracker.csv`; if testing the concrete deliverable framing, send the chosen cohort with `--organization "<names>" --follow-up-asset kit-preview` so the tracker notes preserve who received the variant.
- If the first real `free_async_teardown` lands, record the source tag and whether it came from homepage, pricing, about, outreach, or another campaign link before replying.
- If the first real `partner_request` lands from `partner-preview-hero`, `partner-preview-cta`, or `partner-outreach-batch-01`, log the qualification outcome in `consultant-partner-outreach-tracker.csv`.
- If the first real intake lands with source tag `blog-subprocessor-page-checker-teardown`, `blog-subprocessor-page-checker-pricing`, or `blog-subprocessor-page-checker-partner`, preserve the exact source tag and whether the lead asked for teardown, pricing, or partner help before replying.
- If the first real intake lands with source tag `blog-dpa-objection-window-template` or `blog-dpa-objection-window-cta`, record it in `COMMUNITY-FEEDBACK.md` and preserve the exact source tag before replying.
- If the first tracker-led intake lands, compare whether it came from the download CTA or the teardown CTA and note that in `COMMUNITY-FEEDBACK.md`.
- If the first real intake lands with source tag `review-brief-builder-teardown` or `review-brief-builder-partner`, preserve the exact source tag plus whether the requester role was founder, operator, consultant, fractional DPO, or attorney before replying.
- If the first real intake lands with source tag `sample-teardown-hero`, `sample-teardown-cta`, or `sample-teardown-partner`, record which sample-teardown CTA converted and whether the request came through the founder or advisor path.
- If the first real intake lands with source tag `kit-preview-hero`, `kit-preview-grid`, or `kit-preview-bottom`, record which kit-preview CTA converted and whether it led toward teardown, pricing, or audit intent.
- If the sample teardown page drives three real visits, forwards, or replies before any generator-led inbound, move it into a higher homepage hero or pricing-page slot and compare it against the checker and teardown hooks.
- If a founder, operator, consultant, or attorney reply asks “what is actually inside Starter or Pro?”, send `kit-preview.html` first and note in `COMMUNITY-FEEDBACK.md` whether the concrete preview resolved the objection.
- If an advisor reply references the sample teardown as the reason the workflow clicked, note that in `COMMUNITY-FEEDBACK.md` before deciding whether advisor-first positioning is beating founder-first positioning.
- When the first real `partner_request` lands, send a short approve / clarify / decline reply from `hello@noticekit.tech` and log whether it points to referral-only, client-delivery, or white-label demand.
- When the first real `free_async_teardown` request lands, send a 3-bullet async gap reply from `hello@noticekit.tech` and log the outcome in `COMMUNITY-FEEDBACK.md`.
- If the first real inbound references `generator.html`, `generator-page`, or `generator-cta`, preserve that source tag in the inbox tracker and `COMMUNITY-FEEDBACK.md` before replying.
- If the first teardown or partner request references the new review brief builder, copy the generated blocker and open-question language into `COMMUNITY-FEEDBACK.md` so the next positioning pass can tell whether handoff cleanup is the real pain point.
- If three real `blog-subprocessor-page-checker` visits or replies appear before any founder email reply, move the checker into a higher homepage CTA slot and add it to the pricing-page comparison block.
- If checker-driven teardown requests ask the same missing-field question twice, tighten the checker copy to surface that fix directly in the score output.
- If three real review-brief-builder-led submissions land before any generator-led inbound, move the brief builder into a higher homepage or pricing CTA slot and compare it against teardown-first routing.
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

Completed work stays collapsed below so only live trigger-driven tasks remain in P0-P1.

## Completed Summary

- Launch, checkout, intake, follow-up, outreach, fulfillment, SEO, ops, analytics, partner intake activation, verifier cleanup, partner batch 01 send, partner follow-up readiness, validation/status logging, homepage/pricing/intake copy refreshes, generator launch and handoff fixes, validation-memory cleanup, the dedicated free async teardown landing page, the browser-only subprocessor page checker, the browser-only subprocessor review brief builder, the vendor-change review packet guide, checker intent-tag routing, review-brief-builder watched-source filters and counters, direct partner-access CTA routing, repeated no-reply maintenance checkpoints through 2026-05-02 23:22 UTC, live self-audit follow-up QA refreshes through 2026-05-02 23:22 UTC, the 2026-05-02 live self-audit production verification refresh, the post-verifier inbox/validation status resync fix after synthetic Blob cleanup, the homepage/pricing partner-preview surfacing, the sample async teardown deliverable page, the page-change-monitoring comparison page, the buyer-facing kit preview page, the buyer-path start-here guide, the deploy exclusion hardening for internal ops files, the homepage and pricing-page comparison CTAs, the workspace-blocked indexing note, the homepage concierge-audit CTA consistency fix, the partner follow-up CTA-variant tooling, the pricing-page FAQ schema refresh, and the new site-link checker are done; this backlog stays collapsed to live P0/P1 triggers only.
