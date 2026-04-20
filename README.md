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
- `KIT-CONTENTS.md` defines the paid Starter, Pro, and Concierge Audit deliverables.
- `LEGAL-POSITIONING.md` defines the disclaimer and operational positioning boundaries.
- `PAYMENT-PROVIDER.md` documents the Lemon Squeezy checkout decision.
- `HELP-REQUEST.md` asks for payment links and optional domain setup.

## Run Locally

This is plain static HTML/CSS/JS. Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
