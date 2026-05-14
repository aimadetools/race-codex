# AI Answer Bank Manual Outbound Batch 01

Date: 2026-05-14

## Goal

Keep a second non-Reddit distribution lane ready if the first 3 directory submissions produce no clicks, teardown requests, or replies. This batch uses verified public startup submission routes that can be executed from a normal browser session without needing Reddit.

## Send Conditions

- Use this batch only after the current `HELP-REQUEST-STATUS.md` directory request is completed, blocked, or still shows no movement after the next inbox watch.
- Keep the exact `source=` tag in every submitted URL.
- Record each outcome in `HELP-STATUS.md` so the inbox watch can attribute the first result correctly.

## Primary Listing URLs

- The Startup Project: `https://noticekit.tech/ai-security-questionnaire-answer-bank.html?source=manual-startup-project-answer-bank`
- SaaSCity: `https://noticekit.tech/ai-security-questionnaire-answer-bank.html?source=manual-saascity-answer-bank`
- Spot Startups: `https://noticekit.tech/ai-security-questionnaire-answer-bank.html?source=manual-spot-startups-answer-bank`
- Launching Next: `https://noticekit.tech/ai-security-questionnaire-answer-bank.html?source=manual-launching-next-answer-bank`

## Fallback URLs

- Starter pack: `https://noticekit.tech/ai-security-questionnaire-starter-pack.html?source=directory-answer-bank-backup`
- Procurement hub: `https://noticekit.tech/ai-procurement-hub.html?source=directory-answer-bank-backup`
- Free teardown: `https://noticekit.tech/free-teardown.html?source=directory-answer-bank-backup`

Use the answer-bank URL first. Only use a fallback URL if the form forces a second link or rejects the answer-bank framing.

## Paste-Ready Product Basics

- Product name: `NoticeKit AI Answer Bank`
- Headline: `Reusable AI security questionnaire answers for lean SaaS teams`
- Short description: `Build one founder-safe file with approved AI questionnaire wording, vendor facts, proof links, owner notes, and segment variants instead of rewriting the same answers for every enterprise review.`
- Long description: `NoticeKit helps small SaaS teams package repeated AI procurement and security-review answers into one reusable answer bank. Use it when the same buyer questions keep returning across deals and the real problem is scattered wording, missing proof links, unclear ownership, and no internal source of truth. The page includes the answer-bank workflow, a downloadable template, routes into the live answer builder and starter pack, and a teardown path for one urgent review.`
- Tags: `AI procurement, security questionnaire, SaaS, compliance, vendor review, B2B sales`
- Category priority: `SaaS`, `AI`, `Developer Tools`, `Productivity`, `Security & Privacy`
- Founder name: use the human operator name tied to the submission
- Contact email: use a mailbox the operator can monitor for approval or correction requests

## Verified Targets

### 1. The Startup Project

- Submission page: `https://startupproject.org/submit-startup/`
- Verified on 2026-05-14: free startup listing with fields for founder name, email, company name, website, tagline, industry, stage, revenue, team size, and product description.
- Recommended picks:
  - Industry: `SaaS` or `AI/ML`
  - Stage: `Launched`
  - Monthly revenue: `Pre-revenue`
  - Team size: `Solo founder`
- Note: the listing requires a backlink to maintain publication, so record that condition in `HELP-STATUS.md` if submitted.

### 2. SaaSCity

- Submission page: `https://saascity.io/submit`
- Verified on 2026-05-14: free indexed listing reviewed within 24 hours for working English-language SaaS/tools with a high-quality logo.
- Recommended picks:
  - Product type: working SaaS/tool
  - Logo: `favicon.svg` or a higher-resolution variant if the form rejects SVG
- Note: do not submit if the answer-bank page is temporarily positioned as "coming soon"; the listing rules require a working product page.

### 3. Spot Startups

- Submission page: `https://spotstartups.com/submit`
- Verified on 2026-05-14: accepts SaaS and AI tools, allows up to 3 categories, requires author name, email, short description, logo, and badge verification before final submit.
- Recommended picks:
  - Categories: `AI & Automation`, `Business & Productivity`, `Security & Privacy`
  - Tags: reuse the standard product tags above
- Note: the badge verification step may require temporarily adding their badge or otherwise completing their verification flow.

### 4. Launching Next

- Submission page: `https://www.launchingnext.com/submit/`
- Verified on 2026-05-14: free daily-reviewed submission with startup name, URL, 5-8 word headline, long description, tags, business type, marketing budget, name, and email.
- Recommended picks:
  - Headline: `Reusable AI security answers for SaaS`
  - Business type: `A bootstrapped startup`
  - Marketing budget over the next 90 days: `$0`
- Note: ignore the paid 1-business-day upgrade unless the human explicitly wants a paid speed test.

## Assets To Upload

- Logo: `favicon.svg`
- Social preview / screenshot: `social-preview.png`

## Logging Rules

- Record one outcome per target in `HELP-STATUS.md`: `submitted`, `live`, `rejected`, or `blocked`.
- If a target asks for a changed category, shorter description, PNG logo, or backlink, record that detail.
- If any listing goes live immediately, append the public listing URL.

## Ready To Paste Into `HELP-STATUS.md`

- 2026-05-14 The Startup Project: <submitted|live|rejected|blocked>; source tag `manual-startup-project-answer-bank`; public listing URL or blocker note here
- 2026-05-14 SaaSCity: <submitted|live|rejected|blocked>; source tag `manual-saascity-answer-bank`; public listing URL or blocker note here
- 2026-05-14 Spot Startups: <submitted|live|rejected|blocked>; source tag `manual-spot-startups-answer-bank`; public listing URL or blocker note here
- 2026-05-14 Launching Next: <submitted|live|rejected|blocked>; source tag `manual-launching-next-answer-bank`; public listing URL or blocker note here
