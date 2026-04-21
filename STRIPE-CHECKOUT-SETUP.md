# Stripe Checkout Setup

Use this file to create the first NoticeKit Stripe Payment Links without another product-spec pass.

## Redirect

Set every successful payment redirect to:

`https://noticekit.tech/purchase-next-steps.html`

The custom domain is connected, and Stripe is configured to redirect to this URL.

## Global Checkout Notes

- Require buyer email.
- Keep purchases one-time only.
- Do not create subscriptions.
- Configure tax and billing-address settings inside Stripe according to the operator's account policy.
- Use USD pricing.
- Use the same operational disclaimer across products:

> NoticeKit provides operational templates, draft language, checklists, and tracking materials for attorney review. It does not provide legal advice, contract interpretation, or an attorney-client relationship.

## Product 1: NoticeKit Starter

Price: `$29` one-time.

Short description:

One vendor change, one notice workflow, and one clean evidence trail.

Long description:

NoticeKit Starter helps a small SaaS team prepare one subprocessor change notice workflow. It includes a subprocessor list template, customer notice email variants, a single-change objection-window tracker, an internal approval checklist, an evidence log template, and an attorney-review handoff note.

Fulfillment note:

Early-access digital files are delivered manually by email. The buyer should receive the Starter kit files and a short attorney-review reminder.

## Product 2: NoticeKit Pro

Price: `$79` one-time.

Short description:

Repeated vendor changes, segmented customer notices, and attorney-ready operating records.

Long description:

NoticeKit Pro includes everything in Starter plus a multi-change vendor register, CSV import/export guide, customer notice matrix, DPA clause intake worksheet, attorney-review packet, procurement-ready summary, 90-day operating calendar, and evidence folder workflow.

Fulfillment note:

Early-access digital files are delivered manually by email. The buyer should receive the Pro kit files, CSV examples, and the evidence workflow.

## Product 3: NoticeKit Concierge Audit

Price: `$249` one-time.

Short description:

A 48-hour operational review of your current subprocessor notice workflow.

Long description:

NoticeKit Concierge Audit reviews one public subprocessor page or equivalent vendor disclosure and one current notice workflow or draft notice. The deliverable is a prioritized operational gap list and remediation plan. It does not include legal advice or contract interpretation.

Fulfillment note:

After purchase, request the buyer's current subprocessor page, upcoming or recent vendor change, notice draft if available, DPA notice language if available, and the deadline or enterprise review date driving urgency.

## First-Buyer Tracking

After every purchase, append a row to `buyer-validation-interview-log.csv` or a private working copy with:

- Product purchased.
- Buyer role.
- Urgency trigger.
- Whether the buyer considered another tier.
- Manual fulfillment time.
- Follow-up question for the pricing plan.

Keep the first five purchases tied to `PRICING-CHANGE-PLAN.md` before changing public prices.
