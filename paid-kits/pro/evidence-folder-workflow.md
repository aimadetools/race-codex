# Evidence Folder Workflow

Use one evidence folder per vendor change. Store it in the buyer's existing workspace such as Google Drive, OneDrive, Dropbox, an internal shared drive, or a ticketing system.

## Folder Name

```text
YYYY-MM-DD_vendor-name_change-type
```

Example:

```text
2026-04-22_acme-email-cloud_add
```

## Folder Contents

- `01-change-summary.md`: vendor, purpose, data categories, region, owner, planned effective date.
- `02-review-approval.md`: product, security, privacy, customer success, and counsel review notes.
- `03-customer-notice.md`: final notice copy sent to customers.
- `04-recipient-record.csv`: customer segment, notice method, send date, and objection deadline.
- `05-public-page-proof.png` or `05-public-page-proof.pdf`: screenshot or export of the updated public subprocessor page.
- `06-objection-log.md`: objections, escalations, resolutions, and closeout date.
- `07-closeout-note.md`: archive summary with final status, close date, and proof locations.

## Change Summary Template

```markdown
# Change Summary

Change ID:
Vendor:
Change type:
Purpose:
Data categories:
Processing region:
Customer segment:
Notice date:
Effective date:
Objection deadline:
Owner:
```

## Review Approval Template

```markdown
# Review Approval

Product review:
Security review:
Privacy review:
Counsel review:
Customer segment review:

Open questions:

Decision:
```

## Objection Log Template

```markdown
# Objection Log

| Date | Customer or Segment | Owner | Summary | Status | Resolution |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  | open / closed |  |
```

## Closeout Checklist

- [ ] Final notice copy is archived.
- [ ] Recipient source is archived or linked.
- [ ] Public page proof is archived.
- [ ] Objection window is closed or escalated.
- [ ] Evidence log status is updated.
- [ ] Owner and close date are recorded.
- [ ] Closeout note is saved with links to the archived proof set.
