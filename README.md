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
- `CSV-FORMAT.md` defines the spreadsheet-safe import/export format.
- `EVIDENCE-WORKFLOW.md` defines the no-backend customer evidence workflow.
- `favicon.svg` provides the browser favicon.
- `GENERATOR-DATA-MODEL.md` defines the local notice generator fields and future CSV header.
- `HOSTED-MONITORING-EVALUATION.md` decides not to build hosted monitoring until paid customers prove recurring demand for NoticeKit-specific change triage.
- `KIT-CONTENTS.md` defines the paid Starter, Pro, and Concierge Audit deliverables.
- `LEGAL-POSITIONING.md` defines the disclaimer and operational positioning boundaries.
- `LOCALIZED-PACKS-EXPLORATION.md` evaluates EU GDPR, UK GDPR, and US enterprise procurement pack opportunities.
- `noticekit-free-checklist.md` is the free downloadable lead magnet.
- `PAYMENT-PROVIDER.md` documents the Stripe Payment Links launch decision.
- `PRICING-CHANGE-PLAN.md` defines how to adjust Starter, Pro, Concierge, add-ons, and discounts after the first five sales.
- `purchase-next-steps.html` is the noindex Stripe success-redirect page for early-access buyers.
- `robots.txt` and `sitemap.xml` expose the public static pages for search crawlers.
- `sample-subprocessor-notice.csv` is a sample NoticeKit CSV import/export file.
- `social-preview.png` is the compressed 1200x630 social sharing image, generated from `social-preview.svg`.
- `STRIPE-CHECKOUT-SETUP.md` gives the human operator exact Stripe product, fulfillment, and redirect instructions.
- `SUBSCRIPTION-TIER-DECISION.md` defines when a recurring tier should be tested and keeps subscriptions off the public launch until customers ask for ongoing reminders or monitoring.
- `404.html` is the static not-found page for broken routes.
- `ANALYTICS-DECISION.md` records the Vercel Web Analytics choice and dashboard enablement step.
- `audit-request.html` is a temporary no-backend intake page that opens a structured audit request email while form and checkout setup are pending.
- `HELP-REQUEST.md` is the current Stripe payment-link and low-cost-domain request. `HELP-STATUS.md` tracks whether the human setup is complete.

## Run Locally

This is plain static HTML/CSS/JS. Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
