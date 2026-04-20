# NoticeKit Benchmark Report Methodology

Date: 2026-04-20

## Report Goal

Create a defensible public benchmark report reviewing 50 SaaS subprocessor pages so NoticeKit can publish useful compliance-operations research and generate qualified founder, consultant, and attorney leads.

The first report should answer one practical question:

> Do small SaaS teams publish enough subprocessor notice information for customers to understand what changed, when it changed, and how to object if their agreement allows it?

## Audience

Primary readers:

- B2B SaaS founders and operators preparing for enterprise procurement.
- Fractional DPOs and privacy consultants who improve customer notice workflows.
- Startup attorneys who want clients to bring cleaner operational facts to review.

Secondary readers:

- Security and compliance consultants.
- Customer success and RevOps leaders handling enterprise accounts.
- Buyers comparing manual spreadsheets, page monitors, and trust centers.

## Sample Design

Review 50 public subprocessor pages from small and mid-market SaaS companies.

### Inclusion Criteria

A company qualifies when:

- It sells B2B software or developer infrastructure.
- It has a public subprocessor, subprocessors, vendor, or privacy subprocessors page.
- The page is accessible without login, NDA, or payment.
- The company appears to serve business customers, not only consumers.
- The page includes at least one third-party vendor, affiliate, or infrastructure provider.

### Exclusion Criteria

Exclude companies when:

- The only public privacy page is a generic privacy policy with no subprocessor list.
- The page is hidden behind a trust-center access gate.
- The company is primarily a marketplace, agency, law firm, or consultancy rather than a software product.
- The page is an obvious abandoned domain, placeholder, or broken page.
- The company is so large that its process is not useful for the small-SaaS wedge.

### Target Mix

Aim for this rough sample:

| Segment | Target Count |
| --- | ---: |
| Developer tools and infrastructure | 10 |
| B2B productivity and collaboration | 10 |
| Data, analytics, and AI tools | 10 |
| Sales, marketing, and customer support SaaS | 10 |
| Security, compliance, and operations SaaS | 10 |

Do not force the mix if public pages are hard to find. Record the final mix transparently.

## Discovery Sources

Use public sources only:

- Company privacy policy footer links.
- Public trust center resource pages.
- Search queries such as `"subprocessors" "SaaS"` and `"subprocessor list" "privacy"`.
- Product directories and startup lists, followed by manual verification.
- Consultant or attorney examples only when the company page itself is public.

Do not scrape login-gated trust centers or bypass access controls.

## Fields To Capture

Create a spreadsheet with one row per company and these columns:

| Field | Type | Notes |
| --- | --- | --- |
| company_name | text | Public company or product name. |
| homepage_url | url | Main website. |
| subprocessor_url | url | Public page reviewed. |
| category | enum | One of the target sample segments. |
| page_title | text | Page title or visible H1. |
| date_reviewed | date | ISO date of review. |
| last_updated_visible | enum | Yes, no, unclear. |
| last_updated_value | text | Exact visible date if present. |
| vendor_names_listed | enum | Yes, partial, no. |
| service_purpose_listed | enum | Yes, partial, no. |
| data_categories_listed | enum | Yes, partial, no. |
| processing_region_listed | enum | Yes, partial, no. |
| change_notice_method_listed | enum | Yes, no, unclear. |
| objection_window_listed | enum | Yes, no, unclear. |
| customer_action_path_listed | enum | Yes, no, unclear. |
| archive_or_change_log_visible | enum | Yes, no, unclear. |
| contact_or_owner_visible | enum | Yes, no, unclear. |
| trust_center_gate | enum | Public, gated, mixed. |
| notes | text | Short factual notes only. |
| score | number | Calculated from rubric. |

## Scoring Rubric

Score each page out of 20 points.

| Criterion | Points |
| --- | ---: |
| Public, easy-to-find subprocessor page | 2 |
| Visible last updated date | 2 |
| Vendor names are specific | 2 |
| Service purpose is listed for each vendor | 2 |
| Data categories or processing scope are listed | 2 |
| Processing region or transfer context is listed | 2 |
| Notice method for changes is described | 2 |
| Objection window or customer rights path is described | 2 |
| Contact/action path is clear | 2 |
| Change log, archive, or version history is visible | 2 |

Partial credit:

- Award 1 point when the criterion is present but incomplete, vague, or only available for some vendors.
- Award 0 points when absent, inaccessible, or too ambiguous to rely on.

## Grade Bands

| Score | Band | Interpretation |
| ---: | --- | --- |
| 17-20 | Strong | Customer can understand vendors, changes, and action paths with little friction. |
| 13-16 | Adequate | Core vendor facts exist, but notice mechanics or evidence history may be weak. |
| 9-12 | Thin | Page lists vendors but leaves important customer notice questions unanswered. |
| 0-8 | Risky | Page is hard to use for procurement, customer notice, or internal evidence. |

Avoid saying a company is non-compliant. The report evaluates public operational clarity, not legal compliance.

## Reviewer Rules

Use two-pass review for consistency:

1. First pass captures factual fields and provisional scores.
2. Second pass rechecks every page with scores below 9 or above 17.
3. Keep short evidence notes for each score.
4. Do not infer contract obligations from a public page.
5. Do not publish accusations, legal conclusions, or screenshots unless the company page clearly permits it.

## Bias Controls

To keep the report credible:

- Include companies with good, average, and weak pages.
- Do not only sample companies that make NoticeKit look necessary.
- Record selection source for each company.
- Separate visible facts from reviewer interpretation.
- Make the scoring rubric public in the report appendix.
- Offer companies a correction path for factual errors.

## Report Structure

Recommended first report outline:

1. Executive summary.
2. What was reviewed.
3. Key findings.
4. Benchmark score distribution.
5. Most common gaps.
6. Examples of useful page patterns.
7. What small SaaS teams should add before enterprise review.
8. Methodology and limitations.
9. Free checklist CTA.
10. NoticeKit Starter, Pro, and Concierge Audit CTA.

## Findings To Look For

Likely quantitative findings:

- Percent of pages with visible last-updated dates.
- Percent listing purpose by vendor.
- Percent listing data categories.
- Percent describing notice method.
- Percent describing objection or customer action path.
- Percent with visible change history.
- Median and average benchmark score.
- Score differences by SaaS category.

Likely qualitative findings:

- Many pages list vendors but not what changed.
- Objection mechanics are often buried in DPA text rather than the public page.
- Trust-center gates can make public customer review harder for small buyers.
- Version history is rare but valuable for procurement and evidence.

## Outreach Use

Use the benchmark ethically as a door opener:

- Send each reviewed company its own factual score and one suggested operational improvement.
- Offer a correction link before public launch when feasible.
- Invite consultants and attorneys to comment on the methodology.
- Avoid "gotcha" posts. Position the report as an operations benchmark.

Suggested outreach subject:

Subprocessor page benchmark: one operational gap we found

Suggested CTA:

Want the scoring checklist we used for the 50-page review?

## Limitations

State these limits in the report:

- The review uses public pages only.
- The score does not measure legal compliance.
- Private customer notices, gated trust centers, and contract-specific DPA terms may contain additional details.
- The review reflects pages as they appeared on the review date.
- The report is operational research, not legal advice.

## Production Timeline

| Day | Work |
| --- | --- |
| 1 | Build target list and spreadsheet. |
| 2 | Review first 25 pages. |
| 3 | Review remaining 25 pages. |
| 4 | Second-pass review and scoring calibration. |
| 5 | Draft report and charts. |
| 6 | Send factual corrections to selected companies or advisors. |
| 7 | Publish report, checklist CTA, and partner outreach. |

## Required Assets

- Benchmark spreadsheet.
- Scoring appendix.
- One chart for score distribution.
- One chart for common missing fields.
- Short landing page section for the report.
- Email snippets for company, consultant, and attorney outreach.

## Next Step

Create the benchmark spreadsheet with the fields above, then review five pages as a calibration sample before committing to all 50.
