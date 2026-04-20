# Recurring Subscription Tier Decision

Date: 2026-04-20

This is a product packaging decision. It does not create a public subscription offer yet.

## Decision

Do not launch a recurring subscription tier before the first sales.

Keep NoticeKit's public pricing as one-time products:

- Starter: $29 one-time.
- Pro: $79 one-time.
- Concierge Audit: $249 one-time.

A subscription only makes sense if customers explicitly ask NoticeKit to provide recurring reminders, hosted monitoring, monthly triage, or ongoing evidence maintenance. Without that pull, a subscription would make the product feel heavier than the static-first promise.

## Why

The current buyer is a small SaaS founder or operator with a specific operational chore: handle a subprocessor change, draft the notice, track the objection window, and keep evidence. That buying moment supports a one-time kit or a one-time audit.

A subscription changes the promise. It implies ongoing service, support, monitoring reliability, data retention, notification delivery, and customer account management. Those costs are only justified if the buyer wants NoticeKit to keep watch or maintain records over time.

## Subscription Trigger

Revisit subscriptions only if at least 3 of these are true after customer validation:

| Signal | Evidence required |
|---|---|
| Reminder demand | At least 3 customers ask for recurring objection-window, renewal, vendor-review, or evidence-closeout reminders. |
| Monitoring demand | At least 3 customers ask NoticeKit to monitor vendor or subprocessor pages, not just provide templates. |
| Monthly workflow demand | At least 2 customers say they add, remove, or review subprocessors every month or quarter. |
| Paid upgrade demand | At least 2 customers accept a concrete monthly price after buying or seriously considering Starter, Pro, or Concierge Audit. |
| Manual service burden | Concierge audits create repeated monthly follow-up work that can be standardized. |

Do not launch a subscription based only on founder preference for recurring revenue.

## Tier To Test If Triggered

If the trigger is met, test one add-on before creating multiple plans:

| Offer | Test price | Scope |
|---|---:|---|
| NoticeKit Maintainer | $19/month | Monthly reminder checklist, up to 10 watched vendor records, CSV refresh prompt, and evidence-closeout email templates. |

This should stay positioned as an add-on to Pro, not a replacement for the one-time kit.

Only test higher tiers after customers ask for hosted monitoring or human review:

| Offer | Test price | Scope |
|---|---:|---|
| NoticeKit Monitor | $49/month | Public URL monitoring plus NoticeKit-specific change triage for up to 30 pages. |
| NoticeKit Review | $149/month | Monthly human review queue and evidence packet preparation for teams with repeated vendor changes. |

## Launch Rules

Before publishing any recurring tier:

- Checkout links for one-time products must be live.
- At least one one-time product or concierge audit must have sold.
- The subscription must have a cancellation and refund policy.
- The public page must clearly say what is automated, what is manual, and what is not legal advice.
- Any hosted storage must have a retention policy.
- Any reminder or monitoring promise must define frequency and failure boundaries.

## Landing Page Copy To Hold

Do not publish this copy yet. Save it for interviews and checkout tests:

"Add monthly reminders when your subprocessor list changes more than once a quarter."

"For teams with repeated vendor changes, NoticeKit Maintainer keeps the CSV, evidence checklist, and objection-window reminders in motion."

"Use the one-time kit for a single change. Add Maintainer only when vendor changes become a recurring workflow."

## Recommendation

Leave the public pricing page unchanged. Ask every paying or serious buyer whether they want one-time help, recurring reminders, hosted monitoring, or monthly review. If the first five sales are mostly one-time change events, keep subscriptions off the roadmap. If buyers ask NoticeKit to keep the workflow alive month after month, test the $19/month Maintainer add-on first.

