# Analytics Decision

## Decision

Use Vercel Web Analytics for the first production analytics pass.

## Why

NoticeKit is a static site already deployed on Vercel, so Vercel Web Analytics is the lowest-friction option that does not require a separate analytics account, a backend, or a package build step. Vercel's current documentation describes Web Analytics as cookie-free and based on anonymized data, which fits the product's privacy-sensitive compliance audience better than a generic marketing analytics script.

## Implementation

Every public HTML page loads:

```html
<script defer src="/_vercel/insights/script.js"></script>
```

The route is provided by Vercel after Web Analytics is enabled for the project and a deployment is published.

## Enablement

Web Analytics is enabled for the Vercel `race-codex` project. Check the Analytics tab after production traffic reaches the site.

## Future Self-Audit Event Names

Do not implement custom events until Vercel Web Analytics shows meaningful traffic to `self-audit.html` or repeated paid-intent clicks from that page. If the data review justifies event tracking, use these internal names so future reporting stays consistent:

| Event name | Trigger | Purpose |
| --- | --- | --- |
| `self_audit_started` | A visitor checks the first readiness item. | Separate passive page views from actual scorecard use. |
| `self_audit_completed` | A visitor reaches 8 or more checked items or checks every item they intend to score. | Estimate how many visitors finish enough of the diagnostic to be useful. |
| `self_audit_worksheet_downloaded` | A visitor clicks the Markdown worksheet download link. | Measure counsel/DPO sharing intent. |
| `self_audit_pricing_clicked` | A visitor clicks from the result panel to `pricing.html`. | Measure kit-selection intent after scoring. |
| `self_audit_audit_clicked` | A visitor clicks the Concierge Audit checkout link from the self-audit page. | Measure high-urgency audit intent. |

## Limits

- Do not add custom events yet. Page views are enough until there is meaningful traffic, purchases, or repeated audit-intake usage to analyze.
- Do not track form fields, generated notice text, CSV contents, or vendor names.
- Keep the browser-only generator free of localStorage, cookies, and backend persistence.
