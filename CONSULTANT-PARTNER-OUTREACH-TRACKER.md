# NoticeKit Consultant Partner Outreach Tracker

Date: 2026-04-21

## Purpose

Track consultant, fractional DPO, startup attorney, and compliance-operator partner outreach manually until NoticeKit has a real form endpoint or CRM.

This tracker is separate from `buyer-validation-interview-log.csv`. Do not mark a validation interview complete here. Use this file and `consultant-partner-outreach-tracker.csv` for partner pipeline status, referral fit, white-label interest, and follow-up ownership.

## Use Rules

- Add a prospect only after there is a public source URL or direct warm intro source.
- Keep `outreach_status` as `blocked_contact_setup` until `HELP-STATUS.md` includes a public NoticeKit contact address.
- Keep `checkout_status` as `ready` because the three Stripe Payment Links are live on the pricing page.
- Record actual replies only after they happen.
- Move interview scoring to `buyer-validation-interview-log.csv` only after a real conversation.
- Preserve the non-legal-advice boundary in every message.

## Status Values

| Field | Allowed values |
| --- | --- |
| outreach_status | blocked_contact_setup, ready_to_send, sent, replied, booked, not_fit, no_response |
| referral_fit | unknown, low, medium, high |
| white_label_interest | unknown, no, maybe, yes |
| validation_interview_status | not_requested, requested, booked, completed, declined |
| next_action | wait_for_contact_setup, personalize_message, send_email, follow_up, book_call, archive |

## Initial Prospects

The CSV starts with the five advisor targets already prepared in `BUYER-VALIDATION-OUTREACH-BATCH-02.md`:

1. Bamboo Data Consulting
2. Privageo
3. ATOM
4. Coto & Waddington
5. Altum Legal

They remain `blocked_contact_setup` until the human returns the public contact address. Checkout is ready because the Stripe links are live.

## Partner-Specific Qualification

Before offering white-label use, confirm:

- The prospect serves B2B SaaS or startup clients.
- The prospect understands NoticeKit is operational tooling, not legal advice.
- The prospect agrees to preserve disclaimer language.
- The prospect has a plausible path to at least two client referrals.
- The prospect will not publish or resell the raw templates as a standalone product.

## Next Expansion

After checkout and contact setup are complete, expand the tracker to 20 partner prospects from:

- Fractional DPO directories and privacy consultant searches.
- SaaS-focused startup attorneys who publish DPA or privacy content.
- SOC 2 and security-readiness consultants serving small SaaS companies.
- Founder community operators who run compliance or procurement-readiness sessions.
