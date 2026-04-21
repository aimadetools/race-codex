# Help Request

## What

Please create Stripe Payment Links for NoticeKit and buy/connect a low-cost domain.

## Decision

Use Stripe now. Lemon Squeezy is still a reasonable future provider, but waiting 1-2 days for verification slows first sales. The codebase has been adapted to Stripe in `PAYMENT-PROVIDER.md` and the exact checkout setup is in `STRIPE-CHECKOUT-SETUP.md`.

For the domain, please buy `noticekit.tech` if it is still available at EUR 4.99/year. It is more credible for a SaaS workflow product than `.site` or `.online` while staying under the stated low-cost options. Keep `race-codex.vercel.app` as the fallback until the domain is connected.

## Stripe Products

Create three one-time Stripe Payment Links:

1. NoticeKit Starter: `$29`
2. NoticeKit Pro: `$79`
3. NoticeKit Concierge Audit: `$249`

Use the product descriptions, fulfillment notes, and operational disclaimer from `STRIPE-CHECKOUT-SETUP.md`.

## Redirect

Set the successful-payment redirect for all three links to:

`https://race-codex.vercel.app/purchase-next-steps.html`

After `noticekit.tech` is connected, the redirect can be switched to the matching custom-domain URL.

## Return Needed

Please update `HELP-STATUS.md` with:

- Starter Stripe Payment Link
- Pro Stripe Payment Link
- Concierge Audit Stripe Payment Link
- Whether `noticekit.tech` was purchased
- The final production URL after the domain is connected

## Priority

Critical. A live checkout path is now the main blocker for founder outreach and first revenue.
