# Pricing Change Plan

Date: 2026-04-20

This plan defines how NoticeKit should change pricing after the first five sales. It is designed to avoid reactive price changes from weak signals.

## Current Prices

Keep these prices until at least five paid purchases or paid audit commitments:

- Starter: $29 one-time.
- Pro: $79 one-time.
- Concierge Audit: $249 one-time.

Do not change prices before checkout links are live and at least one buyer has completed a purchase or clearly committed to buy through the available payment path.

## Decision Rule After Five Sales

After the first five sales, review:

| Signal | What to measure |
|---|---|
| Product mix | How many buyers chose Starter, Pro, or Concierge Audit. |
| Discounting | Whether buyers needed coupons, manual concessions, or extra scope to buy. |
| Time cost | How much manual support or audit time each sale required. |
| Urgency | Whether buyers had an active vendor change, customer review, renewal, or DPA issue. |
| Reuse | Whether buyers expected to use the kit once or repeatedly. |
| Objections | Whether price was a real objection or only a polite rejection. |
| Upgrade pull | Whether Starter buyers asked for Pro fields, attorney handoff, or segmentation. |

Make a pricing change only if the pattern is visible across at least three of the first five sales or across two sales plus one serious unpaid buyer with a concrete objection.

## Recommended Changes By Pattern

| Pattern after five sales | Pricing action |
|---|---|
| Most buyers choose Starter and use it for a single urgent change | Keep Starter at $29, leave Pro at $79, improve upgrade copy. |
| Starter buyers ask for Pro features during or after purchase | Raise Starter to $39 or move one repeated-workflow feature back to Pro. |
| Most buyers choose Pro without hesitation | Raise Pro to $99 for new buyers, grandfather existing buyers. |
| Buyers mainly want concierge help | Keep kits unchanged and test Concierge Audit at $299 for the next three audit buyers. |
| Buyers say the kit is useful but too expensive | Keep list prices, test one founder-validation coupon rather than lowering public prices. |
| Buyers want repeated reminders or monitoring | Do not change kit prices yet; use `SUBSCRIPTION-TIER-DECISION.md` to test a recurring add-on. |
| Buyers need attorney review before use | Keep NoticeKit operational, add clearer attorney-handoff value, and avoid legal-advice claims. |

## Guardrails

- Do not lower prices permanently after fewer than five sales.
- Do not add a subscription just to increase revenue predictability.
- Do not bundle concierge time into Pro unless the margin still works.
- Do not imply legal review, legal sufficiency, or attorney-client advice.
- Do not punish early buyers: grandfather their price and scope.
- Do not create more than one new public price test at a time.

## Margin Check

Use Lemon Squeezy as the assumed checkout provider until the human setup changes.

Approximate net before tax and exceptional fees based on the existing provider decision:

| Product | Current price | Estimated Lemon Squeezy fee | Approximate net |
|---|---:|---:|---:|
| Starter | $29 | $1.95 | $27.05 |
| Pro | $79 | $4.45 | $74.55 |
| Concierge Audit | $249 | $12.95 | $236.05 |

Minimum margin expectations:

- Starter should require less than 20 minutes of support.
- Pro should require less than 45 minutes of support.
- Concierge Audit should require less than 2.5 hours of work.

If support time exceeds those limits twice, adjust scope before adjusting price.

## First Price Tests

Use small, reversible tests:

1. Raise Pro from $79 to $99 only if at least three of five buyers choose Pro or ask for repeated-workflow features.
2. Raise Concierge Audit from $249 to $299 only if two buyers buy or seriously request an audit with active urgency.
3. Add a $39 EU GDPR add-on only if paid buyers ask for jurisdiction-specific workflow language, matching the localized-pack decision.
4. Test a $19/month Maintainer add-on only if buyers ask for reminders, hosted monitoring, or monthly review.

Do not run all tests at once. Pick one based on the strongest buyer signal.

## Buyer Questions

Ask these after each sale:

1. Which option did you almost buy instead?
2. Was this a one-time change or a recurring workflow?
3. What would have made Pro obviously worth the difference?
4. Would you have paid $99 for Pro if that were the only repeated-workflow option?
5. Would you have paid $299 for a 48-hour concierge audit?
6. What part felt like a template, and what part felt like operational leverage?
7. Did you need attorney review, and did NoticeKit make that easier?

## Recommendation

Keep the launch prices stable until five sales. The first likely change is not a cheaper Starter tier; it is either a $99 Pro tier if repeated-workflow value is clear, or a $299 Concierge Audit if buyers mostly want urgent done-with-you help. Treat discounts as validation tools, not as the public pricing strategy.

