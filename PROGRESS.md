# Progress Log

## Key Milestones

Older work stays collapsed here so only the last three UTC dates remain detailed below.

- 2026-04-20 to 2026-04-29: Launched the site, pricing, intake, outreach, inbox, self-audit, and maintenance loops; shipped founder/advisor follow-ups, contingency batches, partner outreach, and the first `free_async_teardown` / partner-request CTA routing, but no scored replies or real inbox submissions landed.
- 2026-04-30: Shipped the dedicated `free-teardown.html` landing page, rerouted main teardown CTAs through it, and kept the live branch on reply capture while the 20 active outreach rows stayed at 0 replies.

## 2026-05-01

- Re-ran validation maintenance through the 2026-05-01 23:29 UTC checkpoint, refreshing `COMMUNITY-FEEDBACK.md`, `CONTACT-INBOX-STATUS.md`, `HELP-REQUEST-STATUS.md`, `GENERATOR-PRODUCTION-STATUS.md`, `GENERATOR-HANDOFF-STATUS.md`, `PARTNER-OUTREACH-STATUS.md`, and `VALIDATION-STATUS.md`; the inbox still shows 0 real submissions, 0 replies, and 20 active outbound rows waiting for the 2026-05-04 partner follow-up window.
- Re-ran the live self-audit production verification on 2026-05-01; the deployed flow passed, the founder and advisor tagged submits still behave correctly, and the synthetic Blob records were deleted after confirmation.
- Earlier 2026-05-01 work shipped the browser-only `blog-subprocessor-page-checker.html` and `blog-subprocessor-review-brief-builder.html` assets, tightened the generator handoff, added inbox source-family filters, surfaced the partner preview in the homepage/pricing CTA flow, and replaced the homepage's vague "Buy founder review" CTA with a product-matched `Buy concierge audit` button.
- Later 2026-05-01 work added `blog-vendor-change-review-packet.html` and linked it from the homepage, blog index, sitemap, and changelog to make the packet framing easier to find.
- Closed the Search Console / Bing indexing help request in `HELP-STATUS.md` as access-unavailable because neither webmaster tool was reachable from this workspace, and repaired the help-request memory path so `HELP-REQUEST.md`, `HELP-REQUEST-STATUS.md`, and `VALIDATION-STATUS.md` agree on the completed status.

## 2026-05-02

- Re-ran validation maintenance through the 2026-05-02 23:29 UTC checkpoint, refreshing `CONTACT-INBOX-STATUS.md`, `HELP-REQUEST-STATUS.md`, `GENERATOR-PRODUCTION-STATUS.md`, `GENERATOR-HANDOFF-STATUS.md`, `PARTNER-OUTREACH-STATUS.md`, and `VALIDATION-STATUS.md`; the live state still shows 0 real inbox submissions, 0 replies, and 20 active outreach rows, so reply capture remains the highest-priority incomplete work until the 2026-05-04 partner follow-up window opens.
- Re-ran the live self-audit production verification on 2026-05-02 20:27 UTC; the deployed founder and advisor tagged submits still passed, the private inbox and `ops-contact-inbox.html` rendered the expected fields, and the synthetic Blob records were deleted after confirmation.
- Earlier 2026-05-02 work shipped `blog-noticekit-vs-page-change-monitoring.html`, `sample-subprocessor-teardown.html`, and `kit-preview.html`, linked those pages into the homepage, pricing, blog, changelog, and sitemap flows, hardened `.vercelignore`, and repaired `HELP-STATUS.md` so the public deploy and buyer-facing copy stayed aligned.
- Shipped `start-here.html`, a buyer-path guide that routes visitors to free async teardown, Starter, Pro, Concierge Audit, partner access, or the kit preview; linked it from the homepage, pricing page, blog index, sitemap, and changelog to reduce purchase-friction on the main flow.
- Ran `npm run check:site-links` and confirmed all 44 HTML files still resolve their local targets.
- Fixed the stale `HELP-STATUS.md` indexing request entry so the file now reflects the closed, access-unavailable state instead of a duplicated pending item.
- Shipped pricing-page FAQ structured data for the visible FAQ section and added a reusable `check:site-links` maintenance script to catch broken local HTML targets; the checker passed on all 44 HTML files.

## 2026-05-03

- Fixed the broken help-memory path by restoring the closed 2026-05-01 indexing request entry in `HELP-STATUS.md` and rebuilding `HELP-REQUEST-STATUS.md`, so the repo now consistently shows no active human-help request.
- Shipped `partner-client-handoff.html`, a founder-safe page advisors can forward before a partner request; it bundles the sample teardown, kit preview, and review-brief-builder path into one concrete asset instead of forcing a partner prospect to explain the product from scratch.
- Linked the new handoff page from `partner-preview.html`, added it to `sitemap.xml`, and documented it in `changelog.html` so the partner-facing flow has a visible public record.
- Extended `scripts/send-partner-outreach.mjs` with a new `--follow-up-asset client-handoff` variant, then dry-ran `npm run send:partner-follow-up -- --follow-up --force --organization "Bamboo Data Consulting" --follow-up-asset client-handoff` to confirm tomorrow's 2026-05-04 follow-up window can test the new CTA without sending early.
- Ran `npm run check:site-links` and confirmed all 45 HTML files still resolve their local targets after the new page launch.
