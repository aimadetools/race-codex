# NoticeKit Buyer Channel Decision

Date: 2026-04-20

## Decision

Target SaaS founders and operating leaders directly for the first 10 paid conversations and first 5 sales. Treat privacy consultants, fractional DPOs, and startup attorneys as a secondary distribution channel until NoticeKit has proof from direct buyer interviews, one or two paid audits, and a working checkout link.

## Why founders first

Founders can buy immediately when a vendor change blocks a deal, security review, DPA negotiation, or enterprise renewal. The $29 Starter kit and $249 Concierge Audit are simple enough for a founder-led purchase without procurement, and the current static product already speaks to their workflow: subprocessor list, notice copy, objection-window tracker, and evidence log.

Recent market signals support this route:

- A public SaaS DPA example says customers receive 30 days advance notice of new subprocessors and may object on reasonable grounds. That is exactly the operational gap NoticeKit packages. Source: https://www.saas-launchpad.com/dpa
- A recent r/SaaS discussion about GDPR for a 7-person B2B SaaS repeatedly frames the need as a lightweight baseline: data mapping, privacy notice, subprocessor list, DPA, deletion/export, and documentation. Source: https://www.reddit.com/r/SaaS/comments/1oz498l/do_we_actually_need_gdpr_compliance_if_all_our/
- A recent r/SaaS thread from a US B2B SaaS around 60 people says GDPR became unavoidable after larger customers asked detailed questions, and commenters specifically call out subprocessors as a place where surprises hide. Source: https://www.reddit.com/r/SaaS/comments/1rj51wm/gdpr_sounded_easier_in_theory/
- A current r/GRC thread shows vendor-side changes and downstream subprocessors are an active operational concern, while practitioners warn that broad vendor-risk work expands quickly and needs practical scoping. Source: https://www.reddit.com/r/grc/comments/1snlira/how_do_your_catch_vendorside_changes_in_practice/

The founder buyer has visible urgency before NoticeKit has brand trust. They also produce the clearest product feedback: which DPA fields matter, whether the notice copy is usable, whether CSV is enough, and whether the audit offer is worth paying for.

## Why consultants second

Consultants are attractive because one partner can reuse the kit across clients, but they need more proof before they will attach their reputation to it. They also create channel complexity: referral tracking, white-label rights, support boundaries, and legal-positioning review. Those are already designed in `CONSULTANT-REFERRAL-STRATEGY.md`, but they should not be the main path until NoticeKit can say what founders actually bought or rejected.

Consultants should still be interviewed during validation because they can pressure-test the workflow and may become high-quality referrers. They are not the primary checkout target for the first sales sprint.

## First 10 Conversations

Use this mix:

| Segment | Count | Goal |
|---|---:|---|
| SaaS founders or operators with public DPA/subprocessor pages | 5 | Confirm pain, urgency, buying trigger, and acceptable price. |
| Fractional DPOs or privacy consultants | 3 | Confirm repeatability, client language, and white-label constraints. |
| Startup attorneys or legal ops advisors | 2 | Confirm disclaimer boundaries and attorney-review handoff usefulness. |

## Qualification Signals

Prioritize founder targets that show at least two of these:

- Public DPA, privacy, security, trust, or subprocessor page.
- EU/UK customers, enterprise customers, healthcare, finance, HR, analytics, support, or AI use case.
- Recently added AI, analytics, support, email, cloud, or payments vendors.
- No visible "last updated" date on the subprocessor list.
- DPA mentions advance notice, objection rights, approved subprocessors, or notice by email.
- Founder-led or small team likely below the budget threshold for a full trust center.

## Outreach Angle

Lead with a specific operational gap, not "GDPR compliance."

Use:

> I noticed your legal/trust page names subprocessors but I could not find the workflow customers would see when that list changes. I am testing a lightweight subprocessor notice kit for small SaaS teams: notice copy, objection-window tracker, and evidence log. Could I ask 6 questions about how you handle vendor changes today?

Avoid:

- Claiming their page is non-compliant.
- Giving legal advice.
- Saying NoticeKit can determine whether notice is legally required.
- Pitching hosted monitoring before validating demand.

## Revenue Implication

Keep public pricing as-is for now:

- Starter at $29 for one vendor change.
- Pro at $79 for repeated workflows.
- Concierge Audit at $249 for urgent vendor changes or enterprise review.

During interviews, ask every founder to choose one of three concrete next steps:

1. Would not use this.
2. Would use the free checklist only.
3. Would pay $29, $79, or $249 if checkout were live.

Only revisit pricing after at least five direct founder conversations or one paid audit.
