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
- `blog-subprocessor-list-template.html` is the third SEO article and public subprocessor list template.
- `blog-subprocessor-change-notice-template.html` is the first SEO article and public notice template.
- `BUYER-CHANNEL-DECISION.md` decides that founders are the first sales channel and consultants are secondary until direct demand is proven.
- `BUYER-VALIDATION-OUTREACH-BATCH-01.md` and `buyer-validation-outreach-batch-01.csv` prepare the first five founder/operator validation targets for outreach after contact and checkout setup are complete.
- `BUYER-VALIDATION-OUTREACH-BATCH-02.md` and `buyer-validation-outreach-batch-02.csv` prepare the three fractional DPO/privacy consultant and two startup attorney validation targets for outreach after contact and checkout setup are complete.
- `buyer-validation-interview-log.csv` is the simple scoring log for founder, consultant, and attorney validation interviews.
- `BUYER-VALIDATION-PACKET.md` contains the interview scripts, scoring rubric, decision gates, and outreach templates for buyer validation.
- `changelog.html` is the public changelog for product, content, and deployment updates.
- `COMPETITOR-MATRIX.md` compares NoticeKit against page monitors, DPA templates, trust centers, and spreadsheets.
- `CONSULTANT-REFERRAL-STRATEGY.md` defines partner profiles, white-label rights, coupon codes, and referral terms.
- `CONSULTANT-PARTNER-OUTREACH-TRACKER.md` and `consultant-partner-outreach-tracker.csv` track consultant partner prospects manually until a form endpoint or CRM exists.
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
- `partner-preview.html` and `noticekit-partner-preview.pdf` provide a consultant/advisor partner preview based on the Pro kit manifest.
- `PAYMENT-PROVIDER.md` documents the Stripe Payment Links launch decision.
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
- `scripts/build-validation-send-plan.mjs` regenerates the send-plan summary from the prepared outreach CSVs.
- `validation-outreach-drafts/` contains the send-ready founder, consultant, and attorney outreach drafts produced from the prepared batches.
- `validation-outreach-eml/` contains RFC-style `.eml` exports for the direct-email validation targets.
- `404.html` is the static not-found page for broken routes.
- `ANALYTICS-DECISION.md` records the Vercel Web Analytics choice and dashboard enablement step.
- `api/contact.js` is the Vercel serverless intake endpoint for audit/contact submissions, with optional webhook forwarding through `CONTACT_WEBHOOK_URL`, SMTP relay forwarding through `CONTACT_SMTP_URL`, or Resend email relay forwarding through `CONTACT_RESEND_API_KEY`.
- `api/contact-webhook.js` is the authenticated internal webhook receiver used as the current forwarding target for `/api/contact`.
- `api/contact-inbox.js` and `ops-contact-inbox.html` provide a private Blob-backed inbox for validated contact submissions when webhook delivery is unavailable.
- `audit-request.html` is the audit, access, partner, and waitlist intake form backed by `/api/contact` and the public contact alias.
- `package.json` pins the `@vercel/blob` dependency used by the private contact inbox fallback.
- `HELP-REQUEST.md` documents the active human setup request for outbound sending or manual outreach. `HELP-STATUS.md` tracks human setup and confirms the alias is live.

## Run Locally

This is plain static HTML/CSS/JS. Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
