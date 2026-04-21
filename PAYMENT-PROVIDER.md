# NoticeKit Payment Provider Decision

Decision date: 2026-04-20

Updated: 2026-04-21 after human setup response.

## Current Decision

Use Stripe Payment Links for the first live checkout.

The original preference was Lemon Squeezy because merchant-of-record tax handling and digital download delivery are useful for a static product. The human operator confirmed Stripe is already available, while Lemon Squeezy setup may take 1-2 days for verification. Speed to first paid validation matters more than the extra fulfillment automation right now.

## Why Stripe Now

NoticeKit needs a live buying path before founder outreach can convert. Stripe Payment Links are good enough for the first sales sprint because they provide:

- Hosted checkout links without adding a backend.
- One-time products for Starter, Pro, and Concierge Audit.
- Buyer email collection through checkout.
- Manual fulfillment while kit files are still early-access.
- Faster launch than waiting for a new merchant-of-record account.

The tradeoff is operational: NoticeKit owns delivery, refunds, tax settings, and buyer support until a merchant-of-record provider is added later. That is acceptable for the first five sales because volume is low and every buyer should be manually followed up anyway.

## Products To Create

| Product | Price | Type | Fulfillment |
|---|---:|---|---|
| NoticeKit Starter | $29 | One-time digital kit | Manual email delivery during early access |
| NoticeKit Pro | $79 | One-time digital kit | Manual email delivery during early access |
| NoticeKit Concierge Audit | $249 | One-time service | Manual audit intake and 48-hour workflow review |

## Stripe Setup Requirements

Create three Stripe Payment Links with:

- Quantity fixed to one unless Stripe requires otherwise.
- Customer email required.
- Billing address and tax settings configured according to the operator's Stripe account policy.
- Success redirect URL: `https://race-codex.vercel.app/purchase-next-steps.html`
- Product descriptions copied from `STRIPE-CHECKOUT-SETUP.md`.
- Fulfillment note: "Digital files and audit intake are delivered manually by email during early access. NoticeKit provides operational templates, not legal advice."

## Site Implementation Plan

1. Human creates the three Stripe Payment Links.
2. Human returns the URLs in `HELP-STATUS.md` or `HELP-REQUEST.md`.
3. Replace pricing-page mailto checkout CTAs with the Stripe URLs.
4. Keep audit and founder-review mailto links until a real contact address is available.
5. Update homepage schema availability from preorder to in-stock after the links are live.
6. Start founder validation outreach from `BUYER-VALIDATION-PACKET.md`.

## Future Revisit

Reconsider Lemon Squeezy, Gumroad, or Stripe Managed Payments only after one of these happens:

- Cross-border tax handling creates material operator burden.
- Manual delivery creates support delays.
- More than five paid kit purchases happen and buyers expect instant downloads.
- Consultants need coupon, affiliate, or white-label delivery workflows that Stripe Payment Links cannot handle cleanly.

## Recommendation

Ship with Stripe now. Do not delay checkout for the ideal provider. The first objective is to learn whether founders will pay $29, $79, or $249 for this workflow when a real purchase button exists.
