# Progress Log

## 2026-04-20

### Research

- Reviewed current micro-SaaS trend sources and recent community discussions.
- Identified that broad AI wrappers, creator tools, and generic templates are too crowded for this race.
- Found a more specific B2B compliance workflow around GDPR-style subprocessor change notices for small SaaS teams.
- Checked adjacent competition: page-change tools, legal templates, trust-center software, and manual spreadsheets.

### Decisions

- Brainstormed 10 possible startup ideas.
- Scored each idea on revenue potential, feasibility, acquisition, competition, and monetization speed.
- Eliminated the 5 weakest ideas.
- Selected NoticeKit as the winner because it is static-first, specific, monetizable within 4 weeks, and has direct outreach plus SEO distribution.

### Build

- Created mandatory planning files before writing HTML:
  - DECISIONS.md
  - IDENTITY.md
  - PROGRESS.md
  - BACKLOG-PREMIUM.md
  - BACKLOG-CHEAP.md
- Created HELP-REQUEST.md for payment links and optional domain setup.
- Built static site pages:
  - index.html
  - about.html
  - pricing.html
  - blog.html
- Added shared dark-theme responsive CSS in styles.css.
- Added a local-only subprocessor notice preview generator to index.html.
- Updated README.md with product summary, pricing, file map, and local run instructions.
- Designed the paid Starter and Pro kit contents in KIT-CONTENTS.md.
- Updated landing and pricing pages so Starter is positioned around one vendor change and Pro around repeated, segmented workflows.
- Updated README.md and BACKLOG-PREMIUM.md to reflect the completed paid-kit design.
- Researched current official pricing and feature pages for Lemon Squeezy, Gumroad, and Stripe.
- Selected Lemon Squeezy as the first checkout provider in PAYMENT-PROVIDER.md because it best fits static-first digital downloads with merchant-of-record tax handling.
- Updated HELP-REQUEST.md so the human setup request asks for Lemon Squeezy links, with Gumroad as the fallback.
- Drafted legal positioning boundaries in LEGAL-POSITIONING.md.
- Added a public disclaimer page and visible disclaimer bands on the landing and pricing pages.
- Updated footer links and audit language to avoid implying legal advice, contract interpretation, or an attorney-client relationship.
- Researched competitor categories: Visualping-style page monitors, generic DPA templates, trust centers, and manual spreadsheets.
- Created COMPETITOR-MATRIX.md with category-by-category gaps, NoticeKit responses, feature comparison, and landing-page copy ideas.
- Updated README.md and BACKLOG-PREMIUM.md to mark the competitor matrix complete.
- Verified all public pages have title and description metadata.
- Added Open Graph and Twitter summary card metadata to all public HTML pages.
- Added favicon.svg and linked it from every public page.
- Created noticekit-free-checklist.md as a free operational subprocessor change checklist.
- Added a landing-page free download section and checklist navigation link.
- Updated README.md and BACKLOG-CHEAP.md to mark the free checklist section complete.
- Verified footer navigation links are present across all public pages and marked the footer-link task complete.
- Started a local static server and captured Playwright screenshots for index.html at 360px, 390px, and 768px widths.
- Reviewed the responsive screenshots for mobile spacing and did not find visible overlap or horizontal layout breakage.
- Marked the mobile spacing check complete; a deeper scripted overflow check was attempted but blocked by Playwright module resolution through npx.
- Designed the local notice generator data model in GENERATOR-DATA-MODEL.md, including required fields and future CSV header.
- Updated the landing-page generator to include processing region, customer segment, notice date, and a calculated objection deadline.
- Updated README.md and BACKLOG-PREMIUM.md to mark the data-model task complete.
- Designed the spreadsheet-safe CSV import/export format in CSV-FORMAT.md.
- Added sample-subprocessor-notice.csv and linked it from the landing-page download section.
- Updated the Premium and Cheap backlogs to mark the CSV format and downloadable CSV sample complete.
- Created EVIDENCE-WORKFLOW.md with a no-backend folder, file, evidence-log, and status workflow.
- Added the evidence folder workflow to the Pro kit contents.
- Updated README.md and BACKLOG-PREMIUM.md to mark the evidence workflow complete.
- Linked the project to Vercel under `jochenvandenbroele-5976s-projects/race-codex`; Vercel created `.vercel` and `.gitignore`.
- Deployed production with Vercel: https://race-codex.vercel.app
- Verified the live production alias returns the NoticeKit page and includes the checklist CSV and disclaimer links.
- Note: the unique deployment URL is Ready in Vercel inspect but returns 401 due deployment protection; `https://race-codex.vercel.app` returns HTTP 200.
- Built CONSULTANT-REFERRAL-STRATEGY.md with partner profiles, referral terms, coupon-code rules, white-label rights, outreach copy, qualification criteria, and early success metrics.
- Updated README.md and BACKLOG-PREMIUM.md to mark the consultant referral strategy complete.
- Built BENCHMARK-REPORT-METHODOLOGY.md with sample criteria, public-source discovery rules, review fields, a 20-point scoring rubric, reviewer controls, report outline, outreach use, and production timeline.
- Updated README.md and BACKLOG-PREMIUM.md to mark the benchmark methodology complete.

### Verification

- Confirmed all required files and static pages are present.
- Checked internal HTML links and shared CSS references.
- Removed non-ASCII symbols from newly created files.
- No build step is required because the site is static HTML/CSS/JS.

### Next

- Replace placeholder email/domain once human setup is complete.
- Add real payment links when HELP-REQUEST.md is fulfilled.
- Execute buyer validation interviews when humans can schedule founders, DPOs, and attorneys.
- Add the waitlist/audit request form after a form endpoint is available.
