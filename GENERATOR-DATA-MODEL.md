# NoticeKit Local Generator Data Model

This model defines the browser-only notice generator and the future CSV import/export shape. It avoids backend storage in v1.

## Core Fields

| Field | Type | Required | Example | Notes |
| --- | --- | --- | --- | --- |
| vendor_name | text | yes | Acme Email Cloud | New, replacement, or removed subprocessor. |
| vendor_purpose | text | yes | transactional email delivery | Plain-language purpose shown in the customer notice. |
| processing_region | text | yes | United States and EU | Region or countries where processing may occur. |
| data_categories | text | yes | customer names and email addresses | Use buyer-friendly categories, not internal database names. |
| customer_segment | text | yes | EU customers on signed DPA | Segment affected by this notice. |
| notice_date | date | yes | 2026-04-20 | Date notice is sent or planned to be sent. |
| effective_date | date | yes | 2026-05-20 | Date vendor change is planned to take effect. |
| objection_window_days | integer | yes | 30 | Contract or policy window for objections. |
| objection_deadline | derived date | yes | 2026-05-20 | Calculated from notice_date plus objection_window_days. |

## Derived Rules

- objection_deadline = notice_date + objection_window_days.
- If notice_date is missing, the generator should show a placeholder deadline.
- If effective_date is earlier than objection_deadline, paid kit templates should flag that for attorney review.
- Field labels should stay plain because founders and operators may not use privacy-team terminology.

## Local Storage Rule

The public generator should not persist values to localStorage, cookies, analytics, or a backend in v1. Values exist only in the current browser session and are used to render preview copy.

## Future CSV Header

```csv
vendor_name,vendor_purpose,processing_region,data_categories,customer_segment,notice_date,effective_date,objection_window_days,objection_deadline
```
