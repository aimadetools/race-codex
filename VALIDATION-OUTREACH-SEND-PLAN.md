# NoticeKit Validation Outreach Send Plan

Date: 2026-04-22

This plan translates the prepared outreach batches into the first operational send queue.
Batch 01 is now sent; use this plan for batch 02 routing and follow-up planning.

Direct-email targets identified: 8

## Current Priority

Monitor founder replies from batch 01 and keep interview conversion moving. Advisor batch 02 has now been sent on 2026-04-22 under an explicit operator override, including the Privageo public-inbox route.

## Batch 01

Status: sent on 2026-04-22.

| Priority | Target | Segment | Route | Send method |
|---:|---|---|---|---|
| 1 | ReadMe | Founder/operator | https://readme.com/pricing -> Contact Sales; docs.readme.com support widget | manual-form |
| 2 | EF Loads | Founder/operator | support@efloads.com or legal@efloads.com | direct-email |
| 3 | BMBerry | Founder/operator | support@bmberry.com | direct-email |
| 4 | RootCause / Bryntum | Founder/operator | https://therootcause.io/contact/ or dpo@bryntum.com | direct-email |
| 5 | Deployable AI Services | Founder/operator | mbinghelaita@deployableai.ae | direct-email |


## Batch 02

Status: sent on 2026-04-22 under an explicit operator override to the sequencing hold.

| Priority | Target | Segment | Route | Send method |
|---:|---|---|---|---|
| 1 | Bamboo Data Consulting | Fractional DPO/privacy consultant | info@bamboodc.com or https://www.bamboodataconsulting.com/contact-us | direct-email |
| 2 | Privageo | Fractional DPO/privacy consultant | https://privageo.com/contact-us/ | manual-form / public inbox |
| 3 | ATOM | Fractional DPO/privacy consultant | info@theatomgroup.com or https://www.theatomgroup.com/contact | direct-email |
| 4 | Coto & Waddington | Startup attorney/legal advisor | contact@cotowaddington.com or https://cotowaddington.com/contact-us/ | direct-email |
| 5 | Altum Legal | Startup attorney/legal advisor | info@altumlegal.com or https://altumlegal.com/contact | direct-email |

## Notes

- `direct-email` means the public route is a real email address or `mailto:` link.
- `manual-form` means the public route is a contact page, support widget, or contact-sales flow that needs human submission.
- `manual` means the route needs a different delivery path before it can be sent.
- Keep the first five founder/operator targets ahead of advisor outreach, matching `VALIDATION-OUTREACH-SEND-RUNBOOK.md`.
- Dry-run verified on 2026-04-22 with `node scripts/send-validation-batch.mjs --batch 02 --limit 5 --transport resend`: four Resend direct-email routes and one Privageo manual-form route were selected.
- Batch 02 executed on 2026-04-22: four direct-email rows were sent with Resend, and Privageo was sent to the public inbox `letschat@privageo.com` after confirming that address on the contact page.
