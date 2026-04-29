# NoticeKit - The $100 AI Startup Race

NoticeKit is a static-first startup for small SaaS teams that need to manage GDPR-style subprocessor change notices without buying a full trust center.

## Product

The first version includes:

- A professional landing page.
- Pricing and positioning pages.
- A browser-only notice preview generator.
- A defined paid kit manifest for Starter, Pro, and concierge audits.

## Pricing

- Starter: $29 one-time for one vendor change, one customer notice workflow, and one evidence trail.
- Pro: $79 one-time for repeated vendor changes, segmented customer notice tracking, CSV workflows, and attorney/procurement handoff records.
- Concierge Audit: $249 one-time.

## Files

- `DECISIONS.md` documents research, scoring, and why NoticeKit won.
- `IDENTITY.md` contains positioning, pricing, acquisition, and the 12-week roadmap.
- `BACKLOG-PREMIUM.md` contains strategy-heavy and complex product tasks.
- `BACKLOG-CHEAP.md` contains routine implementation and content tasks.
- `BENCHMARK-REPORT-METHODOLOGY.md` defines the first 50-page public subprocessor benchmark methodology.
- `blog-dpa-objection-window.html` is the second SEO article and objection-window workflow guide.
- `blog-dpa-subprocessor-objection-period-examples.html` is the fourth SEO article and objection-period examples guide.
- `blog-subprocessor-list-template.html` is the third SEO article and public subprocessor list template.
- `blog-subprocessor-list-template-vercel-supabase.html` is the fifth SEO article and stack-specific subprocessor list template.
- `blog-what-is-a-subprocessor-notice.html` is the plain-English primer for new visitors who need the subprocessor notice definition before choosing a workflow.
- `blog-subprocessor-notice-faq.html` is the FAQ article that answers the most common notice timing, proof, and segmentation questions.
- `blog-subprocessor-change-notice-template.html` is the first SEO article and public notice template.
- `BUYER-CHANNEL-DECISION.md` decides that founders are the first sales channel and consultants are secondary until direct demand is proven.
- `BUYER-VALIDATION-OUTREACH-BATCH-01.md` and `buyer-validation-outreach-batch-01.csv` track the first five founder/operator validation targets; batch 01 was sent on 2026-04-22 and is waiting for replies.
- `BUYER-VALIDATION-FOUNDER-FOLLOW-UP-PASS.md` captures the three-business-day founder follow-up queue for batch 01 non-responders.
- `BUYER-VALIDATION-OUTREACH-BATCH-02.md` and `buyer-validation-outreach-batch-02.csv` cover the three fractional DPO/privacy consultant and two startup attorney validation targets; batch 02 was executed on 2026-04-22 under an explicit operator override.
- `BUYER-VALIDATION-ADVISOR-FOLLOW-UP-PASS.md` captures the three-business-day advisor follow-up queue for batch 02 non-responders.
- The follow-up pass generators prefer the actual inbox recorded in outreach CSV `notes` when a first send uncovered a direct-email route, so the queued follow-up route can be narrower than the original public contact path.
- `BUYER-VALIDATION-OUTREACH-BATCH-03.md` and `buyer-validation-outreach-batch-03.csv` define the first founder/operator contingency expansion; batch 03 was sent on 2026-04-28 and is now part of the active outbound reply queue.
- `BUYER-VALIDATION-OUTREACH-BATCH-04.md` and `buyer-validation-outreach-batch-04.csv` define the second founder/operator contingency expansion; batch 04 was also sent on 2026-04-28 and is likewise waiting on replies.
- `buyer-validation-interview-log.csv` is the simple scoring log for founder, consultant, and attorney validation interviews.
- `VALIDATION-POSITIONING-BRIEF.md` is the generated founder-vs-advisor synthesis that weighs scored interviews and tagged async feedback before a positioning change.
- `VALIDATION-DECISION-BRIEF.md` is the generated 2026-04-27 decision snapshot for follow-ups, batch 03 and batch 04 unlocks, and founder-vs-advisor positioning calls; use its execution queue for the exact next commands.
- `VALIDATION-STATUS.md` is the canonical buyer-validation status snapshot for reply monitoring and next-action checks.
- `VALIDATION-REPLY-WATCH.md` is the generated single-file watchboard for outstanding replies, due follow-ups, and the immediate ordered next-action queue.
- `BUYER-VALIDATION-PACKET.md` contains the interview scripts, scoring rubric, decision gates, and outreach templates for buyer validation.
- `OPERATOR-FOUNDER-OUTREACH-CHECKLIST.md` preserves the human-sender checklist used for the first founder validation batch.
- `changelog.html` is the public changelog for product, content, and deployment updates.
- `COMPETITOR-MATRIX.md` compares NoticeKit against page monitors, DPA templates, trust centers, and spreadsheets.
- `CONSULTANT-REFERRAL-STRATEGY.md` defines partner profiles, white-label rights, coupon codes, and referral terms.
- `CONSULTANT-PARTNER-OUTREACH-TRACKER.md` and `consultant-partner-outreach-tracker.csv` track consultant partner prospects manually until a lightweight CRM exists; the first partner-program send can now be executed through `scripts/send-partner-outreach.mjs` and summarized in `PARTNER-OUTREACH-STATUS.md`.
- `CONTACT-DELIVERY.md` documents `/api/contact` delivery status, intake reference IDs, webhook and email relay environment variables, mailbox handoff steps, and verification steps for connecting a mailbox, CRM, or notification endpoint.
- `CSV-FORMAT.md` defines the spreadsheet-safe import/export format.
- `EVIDENCE-WORKFLOW.md` defines the no-backend customer evidence workflow.
- `favicon.svg` provides the browser favicon.
- `GENERATOR-DATA-MODEL.md` defines the local notice generator fields and future CSV header.
- `HOSTED-MONITORING-EVALUATION.md` decides not to build hosted monitoring until paid customers prove recurring demand for NoticeKit-specific change triage.
- `KIT-CONTENTS.md` defines the paid Starter, Pro, and Concierge Audit deliverables.
- `LEGAL-POSITIONING.md` defines the disclaimer and operational positioning boundaries.
- `LOCALIZED-PACKS-EXPLORATION.md` evaluates EU GDPR, UK GDPR, and US enterprise procurement pack opportunities.
- `noticekit-free-checklist.md` is the free downloadable lead magnet.
- `noticekit-self-audit-worksheet.md` is the downloadable Markdown worksheet version of the public readiness self-audit.
- `partner-preview.html` and `noticekit-partner-preview.pdf` provide a consultant/advisor partner preview based on the Pro kit manifest.
- `PAYMENT-PROVIDER.md` documents the Stripe Payment Links launch decision.
- `paid-kits/` contains the private early-access Starter and Pro fulfillment files, PDF exports, ZIP archives, and first-buyer fulfillment log for manual Stripe buyers; it is excluded from Vercel deployment by `.vercelignore`.
- `PRICING-CHANGE-PLAN.md` defines how to adjust Starter, Pro, Concierge, add-ons, and discounts after the first five sales.
- `purchase-next-steps.html` is the noindex Stripe success-redirect page for early-access buyers.
- `robots.txt` and `sitemap.xml` expose the public static pages for search crawlers.
- `sample-subprocessor-notice.csv` is a sample NoticeKit CSV import/export file.
- `social-preview.png` is the compressed 1200x630 social sharing image, generated from `social-preview.svg`.
- `STRIPE-CHECKOUT-SETUP.md` gives the human operator exact Stripe product, fulfillment, and redirect instructions.
- `SUBSCRIPTION-TIER-DECISION.md` defines when a recurring tier should be tested and keeps subscriptions off the public launch until customers ask for ongoing reminders or monitoring.
- `VALIDATION-OUTREACH-SEND-RUNBOOK.md` defines the send order, prerequisites, tracking statuses, and guardrails for executing the prepared validation outreach once the public mailbox is live.
- `VALIDATION-OUTREACH-SEND-PLAN.md` classifies the prepared outreach queue into direct-email and manual-send targets so the first outreach day is unambiguous.
- `scripts/generate-validation-drafts.mjs` generates per-target outreach draft files from the prepared buyer validation CSVs.
- `scripts/build-founder-follow-up-pass.mjs` regenerates the batch 01 non-responder follow-up queue and due date.
- `scripts/build-advisor-follow-up-pass.mjs` regenerates the batch 02 non-responder follow-up queue and due date.
- `scripts/build-homepage-copy-refresh-queue.mjs` regenerates the advisor-handoff homepage refresh queue from tagged self-audit ownership signals.
- `scripts/build-validation-positioning-brief.mjs` regenerates the founder-vs-advisor positioning readout from interview scores plus tagged async feedback.
- `scripts/build-validation-decision-brief.mjs` regenerates the current validation decision brief for the follow-up window, batch 03 and batch 04 unlocks, and the positioning branch.
- `scripts/build-validation-status.mjs` regenerates the canonical buyer-validation status snapshot.
- `scripts/build-partner-outreach-status.mjs` regenerates the compact partner-outreach watchboard from `consultant-partner-outreach-tracker.csv`.
- `scripts/check-validation-reply-watch.mjs` prints the current reply-watch state and can write `VALIDATION-REPLY-WATCH.md` for repo memory, including the queued follow-up and contingency commands that become active when the next gate date opens.
- `scripts/send-partner-outreach.mjs` dry-runs or sends the first ready partner-program messages through Resend using the same researched direct-email routes as advisor batch 02.
- `scripts/sync-validation-artifacts.mjs` rebuilds the follow-up passes, homepage copy refresh queue, validation positioning brief, validation decision brief, validation status, and validation watch output after any send, reply, bounce, or interview update.
- `npm run build:validation-watch` writes the current validation watchboard to `VALIDATION-REPLY-WATCH.md`.
- `scripts/send-validation-batch.mjs` dry-runs or sends the prepared outreach queue and guarded non-responder follow-ups through SMTP or Resend when an approved sender is available; live sends are date-gated for advisor batch 02, contingency batches 03 and 04, and later contingency batches plus three-business-day follow-ups, with batch 04 additionally blocked until batch 03 is exhausted and founder replies are still zero.
- `scripts/build-validation-send-plan.mjs` regenerates the send-plan summary from the prepared outreach CSVs.
- `scripts/build-paid-kit-fulfillment.mjs` regenerates the private paid-kit PDF exports and ZIP archives for first-buyer fulfillment.
- `validation-outreach-drafts/` contains the send-ready founder, consultant, and attorney outreach drafts produced from the prepared batches.
- `validation-outreach-eml/` contains RFC-style `.eml` exports for the direct-email validation targets.
- `404.html` is the static not-found page for broken routes.
- `ANALYTICS-DECISION.md` records the Vercel Web Analytics choice and dashboard enablement step.
- `api/contact.js` is the Vercel serverless intake endpoint for audit/contact submissions, with optional webhook forwarding through `CONTACT_WEBHOOK_URL`, SMTP relay forwarding through `CONTACT_SMTP_URL`, or Resend email relay forwarding through `RESEND_API_KEY` / `CONTACT_RESEND_API_KEY`.
- `api/contact-webhook.js` is the authenticated internal webhook receiver used as the current forwarding target for `/api/contact`.
- `api/contact-inbox.js` and `ops-contact-inbox.html` provide a private Blob-backed inbox for validated contact submissions, independent of optional webhook or email forwarding.
- `ops-reconcile.html` is the private first-buyer reconciliation view that matches Stripe exports, contact inbox submissions, and fulfillment log rows without adding new backend storage.
- `audit-request.html` is the audit, access, partner, and waitlist intake form backed by `/api/contact` and the public contact alias.
- `package.json` pins `@vercel/blob` for the private contact inbox fallback and `nodemailer` for optional SMTP delivery.
- `HELP-STATUS.md` tracks human setup and confirms the alias, domain, Stripe links, and Resend sender are live.
- `HOMEPAGE-COPY-REFRESH-QUEUE.md` is the generated advisor-handoff homepage pivot brief that only activates when tagged self-audit ownership signals lean consultant/attorney over founder/operator.

## Run Locally

This is plain static HTML/CSS/JS. Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
