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

## Limits

- Do not add custom events yet. Page views are enough until there is meaningful traffic, purchases, or repeated audit-intake usage to analyze.
- Do not track form fields, generated notice text, CSV contents, or vendor names.
- Keep the browser-only generator free of localStorage, cookies, and backend persistence.
