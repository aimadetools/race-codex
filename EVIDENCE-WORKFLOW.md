# NoticeKit Customer Evidence Workflow

This workflow gives small SaaS teams a backend-free way to preserve proof of subprocessor notices.

## Goal

Create an evidence trail that can answer:

- What changed?
- Who reviewed it?
- Which customers or segments were notified?
- When was notice sent?
- When did the objection window close?
- Where is the proof stored?

## Storage Model

Use the customer's existing workspace, not NoticeKit servers:

- Google Drive, Microsoft OneDrive, Dropbox, or an internal shared drive.
- One folder per vendor change.
- One evidence log row per customer segment or notice batch.
- Links to files stored in `evidence_url` in the NoticeKit CSV.

## Folder Naming

Use a stable folder naming pattern:

```text
YYYY-MM-DD_vendor-name_change-type
```

Example:

```text
2026-04-20_acme-email-cloud_add
```

## Folder Contents

Each evidence folder should contain:

- `01-change-summary.md` - vendor, purpose, data categories, region, owner, and planned effective date.
- `02-review-approval.md` - privacy, security, product, and counsel review notes.
- `03-customer-notice.md` - final notice copy sent to customers.
- `04-recipient-record.csv` - customer segment, notice method, send date, and objection deadline.
- `05-public-page-proof.png` or `.pdf` - screenshot or export of the updated public subprocessor page.
- `06-objection-log.md` - objections, escalations, resolutions, and closeout date.
- `07-closeout-note.md` - archive summary with final status, close date, and proof locations.

## Evidence Log Columns

Use these columns in the paid kit evidence log:

```csv
change_id,vendor_name,change_type,customer_segment,notice_date,objection_deadline,notice_method,recipient_source,notice_copy_url,public_page_proof_url,review_approval_url,objection_log_url,status,owner,closed_date
```

## Workflow Steps

1. Create the evidence folder before sending notice.
2. Save the generator output as `03-customer-notice.md`.
3. Save the internal approval checklist as `02-review-approval.md`.
4. Update the public subprocessor list and save a screenshot or PDF export.
5. Send notice using the approved channel.
6. Export or record the recipient segment in `04-recipient-record.csv`.
7. Add links to the NoticeKit evidence log.
8. Track objections until the deadline closes.
9. Save `07-closeout-note.md` once the objection window has closed and the evidence set is complete.
10. Mark the evidence log row as `closed` only after follow-ups are complete.

## Status Values

- `draft` - facts are being gathered.
- `review` - waiting for internal or attorney review.
- `ready` - approved and ready to send.
- `sent` - notice has been sent and evidence is stored.
- `objection_open` - objection window is still active.
- `blocked` - missing review, contract detail, or approval.
- `closed` - objection window closed and evidence is archived.

## No-Backend Boundary

NoticeKit should not collect, upload, store, or sync customer evidence in v1. The product provides structure, templates, local generator output, and CSV-compatible logs that customers store in their own systems.
