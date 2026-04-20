# NoticeKit CSV Import/Export Format

This format is designed to survive edits in Google Sheets, Excel, Numbers, and plain text editors.

## Rules

- Use UTF-8 CSV with a header row.
- Keep dates in `YYYY-MM-DD` format.
- Keep `objection_window_days` as a whole number.
- Use semicolons inside cells for multiple values, not commas.
- Do not rename headers. Add extra columns only after the standard columns.
- Leave derived fields blank only if they can be recalculated by the local generator.
- Avoid formulas in shared CSV files because spreadsheet apps may rewrite them differently.

## Required Headers

```csv
vendor_name,vendor_purpose,change_type,processing_region,data_categories,customer_segment,notice_date,effective_date,objection_window_days,objection_deadline,notice_status,owner,evidence_url,review_notes
```

## Field Definitions

| Header | Required | Type | Example | Notes |
| --- | --- | --- | --- | --- |
| vendor_name | yes | text | Acme Email Cloud | Public vendor or subprocessor name. |
| vendor_purpose | yes | text | Transactional email delivery | Plain-language purpose. |
| change_type | yes | enum | add | Use `add`, `replace`, `remove`, or `update`. |
| processing_region | yes | text | United States; European Union | Use semicolons for multiple regions. |
| data_categories | yes | text | Customer names; email addresses | Buyer-readable categories. |
| customer_segment | yes | text | EU customers on signed DPA | Segment affected by the notice. |
| notice_date | yes | date | 2026-04-20 | Date notice is or was sent. |
| effective_date | yes | date | 2026-05-20 | Planned date the vendor change takes effect. |
| objection_window_days | yes | integer | 30 | Contract or policy window. |
| objection_deadline | yes | date | 2026-05-20 | notice_date plus objection_window_days. |
| notice_status | yes | enum | draft | Use `draft`, `approved`, `sent`, `closed`, or `blocked`. |
| owner | no | text | Priya | Internal owner for the change. |
| evidence_url | no | text | https://example.com/evidence/acme | Link to page version, ticket, doc, or storage location. |
| review_notes | no | text | Counsel to confirm EU transfer language | Short operational notes. |

## Spreadsheet-Safe Example

See `sample-subprocessor-notice.csv`.

## Validation Checklist

- Every row has a vendor name, purpose, customer segment, notice date, effective date, and objection window.
- Every date uses four-digit year, two-digit month, and two-digit day.
- Every objection deadline is equal to notice date plus objection window days.
- Every sent notice has an evidence URL or internal archive reference.
- Any blocked row includes a review note explaining what is missing.
