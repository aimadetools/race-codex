# NoticeKit Paid Kit Fulfillment

These files are the manual early-access fulfillment package for paid Stripe buyers.

They are intentionally excluded from Vercel deployment through `.vercelignore` so paid assets are not served as public static files. Send the relevant folder contents to buyers by email or shared drive after confirming payment in Stripe.

## Fulfillment Rules

- Send Starter buyers the `starter/` folder.
- Send Pro buyers the `starter/` and `pro/` folders.
- For faster first-buyer fulfillment, attach `archives/noticekit-starter-early-access.zip` for Starter buyers and `archives/noticekit-pro-early-access.zip` for Pro buyers.
- The generated PDF versions of Markdown files live in `exports/` and are included in each archive under `pdf-exports/`.
- Record each manual delivery in `FIRST-BUYER-FULFILLMENT-LOG.csv`.
- Send Concierge Audit buyers the audit intake form link and request the current subprocessor page, upcoming vendor change, notice deadline, and any draft notice.
- Include the legal disclaimer in every fulfillment email.
- Record fulfillment time, buyer role, urgency trigger, and follow-up question in a private copy of `buyer-validation-interview-log.csv`.

## Regenerating Artifacts

Run this after editing any paid-kit Markdown file:

```bash
npm run build:paid-kits
```

The script regenerates `exports/` PDFs and the Starter/Pro ZIP archives from the current private source folders.

## Required Disclaimer

NoticeKit provides operational templates, workflow checklists, and local tools for organizing subprocessor change notices. NoticeKit is not a law firm, does not provide legal advice, and does not create an attorney-client relationship. Your contracts, data protection addendum, privacy notices, customer commitments, and applicable laws may require different steps or wording. Have a qualified attorney review your notices, subprocessors, objection process, and customer communications before relying on them.

## Manual Fulfillment Email

Subject: Your NoticeKit files

Hi,

Thanks for buying NoticeKit. Your early-access files are attached or linked here:

- Starter files: subprocessor list, notice templates, objection tracker, approval checklist, evidence log, and attorney handoff note
- Pro files, when purchased: multi-change register, customer notice matrix, DPA intake worksheet, attorney packet, procurement summary, 90-day calendar, CSV guide, and evidence folder workflow

Use these as operational preparation materials for your team and attorney. They do not replace legal advice or contract review.

If you bought Concierge Audit, please send your public subprocessor page, the vendor change you are planning, the notice date or deadline, and any draft notice to hello@noticekit.tech.

Thanks,
NoticeKit
