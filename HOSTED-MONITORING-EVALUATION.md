# Hosted Monitoring Evaluation

Date: 2026-04-20

This is a product and engineering decision for NoticeKit after the first 10 paid customers. It is not legal advice.

## Decision

Do not build hosted monitoring yet.

After the first 10 paid customers, build hosted monitoring only if customers prove that they want NoticeKit to interpret subprocessor changes and trigger the notice workflow, not merely detect page changes.

The near-term product should stay static-first: templates, local generator, CSV workflow, evidence logs, and concierge review. Recommend existing page-monitoring tools when a customer only needs alerts.

## Why Not Now

Generic page monitoring is already mature, inexpensive, and operationally complex to replicate well.

Current signals:

- Visualping positions its value around JavaScript rendering, anti-bot handling, page sections, AI summaries, team workspaces, Slack-style alerting, and reliability across many use cases. Source: https://visualping.io/blog/visualping-pricing-explained
- Distill sells broad page monitoring with free and paid tiers, cloud checks, local/browser checks, push/email/SMS notifications, macros, version history, and extra usage pricing. Source: https://distill.io/pricing/
- ChangeTower offers free and paid plans with content detection, AI monitoring, page-section monitoring, custom interactions, history retention, exportable notifications, and enterprise features. Source: https://changetower.com/pricing
- Wachete already frames web-change monitoring across price tracking, competitor tracking, website health, defacement detection, job alerts, and compliance audit use cases. Source: https://www.wachete.com/

NoticeKit would not win by being a smaller Visualping. Its wedge is the workflow after a change is known: classify the vendor change, decide who needs review, prepare notice copy, track objection windows, and preserve evidence.

## Build Threshold

Consider hosted monitoring only after 10 paid customers if at least 4 of these signals are true:

| Signal | Required evidence |
|---|---|
| Repeated monitoring pull | At least 5 paid customers ask NoticeKit to watch vendor or subprocessor pages for them. |
| Workflow pull, not alert pull | At least 3 customers say generic monitor alerts are insufficient because they still need classification, notice copy, customer segmentation, or evidence packaging. |
| Recurring willingness to pay | At least 3 customers choose a monthly price in an interview or checkout test instead of a one-time kit. |
| High-value source pages | Customers identify 5 or more vendor pages that matter enough to review monthly. |
| Concierge burden | Manual audits require repeated page checks that take more than 2 hours per customer per month. |
| Low false-positive tolerance | Customers say raw page-change alerts create more work unless NoticeKit filters cosmetic or irrelevant changes. |

Do not count curiosity as demand. Count only direct customer requests tied to a paid kit, paid audit, renewal conversation, or explicit monthly price acceptance.

## MVP Scope If Triggered

The first hosted version should be compliance-specific, not a general monitor.

Minimum hosted scope:

- Customer account with a small list of monitored URLs.
- Once-daily checks by default.
- Text extraction for public pages only.
- Change snapshot with before/after text.
- Manual "relevant to subprocessor notice" classification at first.
- NoticeKit-specific fields: vendor, processing purpose, affected customer segment, data categories, region, notice-needed status, objection deadline, and evidence link.
- Email notification only when a change is marked relevant.
- Export to the existing CSV format.

Explicitly exclude in v1:

- Login-wall monitoring.
- CAPTCHA or anti-bot bypassing.
- Five-minute or hourly monitoring.
- Visual screenshot comparison.
- Browser extension.
- Slack, Teams, or webhook routing.
- General competitor-price or website-defacement monitoring.
- Legal conclusions about whether notice is required.

## Pricing Test

Only test subscription pricing after checkout is live and at least one one-time product has sold.

Potential subscription packaging:

| Tier | Price to test | Limit | Buyer promise |
|---|---:|---|---|
| Monitor Add-on | $19/month | 10 public URLs, daily check | "Know when a watched vendor page changes, then use NoticeKit to run the notice workflow." |
| Pro Monitor | $49/month | 30 public URLs, weekly human triage queue | "Turn relevant vendor-page changes into a draft notice packet." |
| Concierge Monitor | $149/month | 30 URLs plus monthly review | "A monthly operational review of vendor-page changes and notice evidence." |

Do not publish these prices yet. Use them as interview anchors after paid customer 10.

## Engineering Notes

Hosted monitoring changes NoticeKit from a static product into an operational SaaS. That adds:

- Scheduler infrastructure.
- Fetching and rendering variability.
- Diff storage.
- User accounts or authenticated workspaces.
- Notification delivery.
- Abuse, blocking, and rate-limit handling.
- Privacy and retention policies for stored page snapshots.
- Support workload for missed or noisy alerts.

The cheapest credible MVP is still more expensive than selling the current one-time kit plus concierge audit. It should therefore be funded by clear recurring demand, not by roadmap optimism.

## Customer Interview Questions

Ask these after the first paid customers:

1. Which subprocessor or vendor pages do you manually re-check today?
2. What happened the last time one changed?
3. Would a generic page-change email solve the problem, or would you still need NoticeKit to classify and document the change?
4. How many pages would be worth monitoring monthly?
5. How often would you want checks to run?
6. What is the cost of a missed relevant change?
7. What is the cost of false-positive alerts?
8. Would you pay $19/month, $49/month, or $149/month for this after buying the kit?

## Recommendation

Keep hosted monitoring out of the first launch. Build one lightweight integration path instead:

- Add copy that says NoticeKit works after a change is found manually or by tools like Visualping, Distill, ChangeTower, or Wachete.
- During concierge audits, record whether customers ask NoticeKit to watch pages for them.
- Revisit hosted monitoring only after 10 paid customers and only if the build threshold is met.

