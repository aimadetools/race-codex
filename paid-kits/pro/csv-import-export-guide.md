# CSV Import And Export Guide

These CSV files are designed for Google Sheets, Excel, Numbers, and browser-local workflows.

## Rules

- Keep the first row as the header row.
- Do not rename headers.
- Add custom fields only after the standard columns.
- Use UTF-8 CSV.
- Use `YYYY-MM-DD` for dates.
- Use semicolons inside cells when listing multiple regions or data categories.
- Avoid formulas in shared CSV files.
- Keep status values consistent so filtering works.

## Standard Notice CSV Header

```csv
vendor_name,vendor_purpose,change_type,processing_region,data_categories,customer_segment,notice_date,effective_date,objection_window_days,objection_deadline,notice_status,owner,evidence_url,review_notes
```

## Status Values

- `draft`: facts are still being gathered.
- `review`: waiting for product, security, privacy, or counsel review.
- `approved`: ready to send.
- `sent`: notice has been sent.
- `objection_open`: objection period is active.
- `blocked`: missing facts, review, approval, or customer routing.
- `closed`: objection window closed and evidence is archived.

## Date Checks

Before sending a notice, confirm:

- `notice_date` is the date the customer notice will be sent.
- `effective_date` is not earlier than the notice deadline unless counsel approves the approach.
- `objection_deadline` equals `notice_date` plus `objection_window_days`.
- Every sent row has an evidence link or internal archive reference.

## Spreadsheet Import Steps

1. Import the CSV into a new spreadsheet.
2. Set date columns to plain date format.
3. Freeze the header row.
4. Protect the header row if your spreadsheet tool supports it.
5. Filter by `notice_status`, `owner`, and `objection_deadline`.
6. Export a backup CSV after each material workflow update.

## Browser-Local Generator Use

The public NoticeKit generator does not upload data. When using generated copy, paste the final draft into your own document or evidence folder and update the relevant CSV evidence fields.
