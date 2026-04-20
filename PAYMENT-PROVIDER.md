# NoticeKit Payment Provider Decision

Decision date: 2026-04-20

## Recommendation

Use Lemon Squeezy for the first paid checkout links.

## Why

NoticeKit is selling low-priced digital downloads and one manual service before there is a backend. The checkout provider should therefore handle hosted checkout, digital file delivery, sales tax/VAT complexity, PayPal/card coverage, and simple links without engineering work.

Lemon Squeezy is the best fit for the first four weeks because it provides:

- Hosted no-code checkout links and checkout overlays.
- Digital download delivery.
- Merchant-of-record sales tax and VAT handling.
- Coupon codes, bundles, PayPal/card support, customer emails, and basic revenue reporting.
- $0 monthly cost.

## Current Fee Notes

Verified against official pricing/docs on 2026-04-20:

- Lemon Squeezy: 5% + $0.50 platform fee, with possible additional fees such as +1.5% for international transactions, +1.5% for PayPal transactions, and +0.5% for subscriptions.
- Gumroad: 10% + $0.50 for direct/profile sales, 30% for marketplace-discovered sales, and merchant-of-record tax handling.
- Stripe Payment Links: included with standard Stripe Payments pricing, but sales tax/VAT handling, digital delivery, and fulfillment would need separate setup. Stripe Managed Payments adds merchant-of-record services at an additional percentage on top of payment fees.

Sources:

- https://www.lemonsqueezy.com/pricing
- https://docs.lemonsqueezy.com/help/getting-started/fees
- https://gumroad.com/pricing
- https://stripe.com/us/pricing

## Net Revenue Estimates

Approximate direct-card checkout before any international, PayPal, refund, or payout exceptions:

| Product | Price | Lemon Squeezy estimated fee | Estimated net before tax | Gumroad direct estimated fee | Gumroad estimated net before tax |
| --- | ---: | ---: | ---: | ---: | ---: |
| Starter | $29 | $1.95 | $27.05 | $3.40 | $25.60 |
| Pro | $79 | $4.45 | $74.55 | $8.40 | $70.60 |
| Concierge Audit | $249 | $12.95 | $236.05 | $25.40 | $223.60 |

Stripe Payment Links would likely produce higher net revenue in simple US-card cases, but the tax, download delivery, support, and receipt workflow would be owned by NoticeKit. That is the wrong tradeoff before the first sales.

## Implementation Plan

1. Create a Lemon Squeezy store for NoticeKit.
2. Create one-time products for Starter, Pro, and Concierge Audit.
3. Attach the final download package to Starter and Pro once the files are built.
4. For Concierge Audit, set fulfillment copy to request the current subprocessor page, upcoming vendor change, and DPA notice language if available.
5. Send checkout URLs back through HELP-REQUEST.md.
6. Replace the current mailto checkout CTAs with Lemon Squeezy checkout URLs.

## Fallback

Use Gumroad if Lemon Squeezy onboarding blocks launch for more than one business day. Use Stripe Payment Links only if the human operator wants to manage tax/delivery manually or already has Stripe Tax and a delivery workflow ready.
