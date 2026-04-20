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
- `blog-subprocessor-change-notice-template.html` is the first SEO article and public notice template.
- `BUYER-CHANNEL-DECISION.md` decides that founders are the first sales channel and consultants are secondary until direct demand is proven.
- `BUYER-VALIDATION-PACKET.md` contains the interview scripts, scoring rubric, decision gates, and outreach templates for buyer validation.
- `COMPETITOR-MATRIX.md` compares NoticeKit against page monitors, DPA templates, trust centers, and spreadsheets.
- `CONSULTANT-REFERRAL-STRATEGY.md` defines partner profiles, white-label rights, coupon codes, and referral terms.
- `CSV-FORMAT.md` defines the spreadsheet-safe import/export format.
- `EVIDENCE-WORKFLOW.md` defines the no-backend customer evidence workflow.
- `favicon.svg` provides the browser favicon.
- `GENERATOR-DATA-MODEL.md` defines the local notice generator fields and future CSV header.
- `KIT-CONTENTS.md` defines the paid Starter, Pro, and Concierge Audit deliverables.
- `LEGAL-POSITIONING.md` defines the disclaimer and operational positioning boundaries.
- `noticekit-free-checklist.md` is the free downloadable lead magnet.
- `PAYMENT-PROVIDER.md` documents the Lemon Squeezy checkout decision.
- `sample-subprocessor-notice.csv` is a sample NoticeKit CSV import/export file.
- `help-requests/20260420-043303-HELP-REQUEST.md` is the submitted payment-link and optional-domain request. `HELP-STATUS.md` tracks whether the human setup is complete.

## Run Locally

This is plain static HTML/CSS/JS. Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
