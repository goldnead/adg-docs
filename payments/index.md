# Payments

<AddonHeader />

Take payments in Statamic with Mollie, and never believe the caller.

A checkout, a webhook that trusts nothing in the request, fulfilment that runs exactly
once, and a handful of events your site listens to. What a payment *means* — access, a
file, an email — stays yours.

<Figure
  src="payments-listing"
  alt="The Payments listing: date, product, amount, status, fulfilled timestamp and buyer, across five brands"
  caption="Every payment the site took, with the status and whether fulfilment has run." />

## The rule everything else follows

**The amount is looked up in the catalogue. It never comes from a request.**

```php
app(Checkout::class)->start('noten-paket', ['email' => $email]);
```

The handle is what the browser sends. The price is read on the server, from
`config/statamic-payments.php` or from a resolver another addon registered. A checkout
that accepted a posted price would sell a €19 thing for a cent, which is the oldest
mistake in online payments and still the most common.

Everything downstream is a consequence of that one rule, and the rest of this
documentation refers back to it rather than restating it:

- **Quantity** is the single figure a checkout takes from a request, and only because the
  unit price does not. The catalogue says what quantities it allows.
- **A coupon** is not an exception. What arrives is a *code*; what it is worth is looked
  up in [Offers](/offers/coupons).
- **The provider decides whether money moved**, not the browser coming back, and not the
  body of a webhook call.

## What you get

- **A checkout** that returns a URL to send the buyer to, and a row that exists before the
  provider is called
- **A webhook** with no shared secret and nothing to forge: it reads an id and asks Mollie
  what that id's status really is
- **Fulfilment exactly once**, claimed with a conditional `UPDATE` before any listener runs
- **Lines, not one product** — an order bump is a second line on the same payment
- **Free products**, at `amount_cent => 0`, paid and fulfilled on the spot through the same
  event
- **Subscriptions, payment plans and trials** — one mechanism, three faces
- **Follow-up offers**, off by default, charged without new card details
- **Refunds recorded**, with a full one withdrawing the access it paid for
- **Abandoned checkouts**, announced once each, off by default
- **Two Control Panel screens**: Payments and Subscriptions, each behind its own permission
- **The facts an invoice needs** — the buyer's country and the discount per line — recorded
  while they still exist

## Mollie, and why

Mollie rather than Stripe because this is built for a German and European audience: SEPA
direct debit, Sofort, iDEAL and Bancontact are what people here reach for, and there is no
monthly floor, which matters on a client site that takes four payments a month.

The provider sits behind three interfaces (`PaymentGateway`, `FollowUpGateway`,
`SubscriptionGateway`) and nothing in them says "Mollie". A second provider is a class and
a container binding, not a fork.

## The shortest useful path

1. `composer require goldnead/statamic-payments`, then `php artisan migrate`.
2. Put `MOLLIE_KEY` in `.env` — a `test_` key moves no money.
3. List one product in `config/statamic-payments.php`, with an integer `amount_cent`.
4. Call `Checkout::start()` from a controller and redirect to `$checkout->checkoutUrl`.
5. Listen for `PaymentPaid` and do whatever the sale means on your site.

[Installation](/payments/installation) has the long version.

## What it deliberately does not do

- **Make refunds.** Those happen in the provider's dashboard, where somebody with the
  authority to move money does it. A button behind a Control Panel permission would be a
  way to refund a customer by misclicking. This addon takes note — see
  [Refunds](/payments/refunds).
- **Decide what a payment means.** No accounts are created, no files are sent, no mail goes
  out. There is exactly one optional exception, the
  [Entitlements](/payments/events#entitlements-optional) bridge, and it is off by default.
- **Know about coupons.** What a code is worth, who may use it and how often are questions
  about pricing. Pricing lives in [Offers](/offers/).
- **Write invoices.** A gapless number, a VAT rate and an immutable document are a separate
  job — [Invoices](/invoices/) does it, and depends on two columns recorded here.
- **Sequence anything.** No steps, no downsells, no "what to offer next". A follow-up offer
  is one offer on one page, charged once.
- **Scope by site.** A payment is a transaction, not content.

## Next

- [Installation](/payments/installation)
- [Configuration](/payments/configuration)
- [Products and the catalogue](/payments/catalogue) — where a price lives
- [Starting a checkout](/payments/checkout) — lines, quantities, discounts, return URLs
- [Reacting to a payment](/payments/events) — the events, and what "once" means
- [Bumps and follow-up offers](/payments/bumps)
- [Subscriptions, plans and trials](/payments/subscriptions)
- [Refunds](/payments/refunds)
- [Abandoned checkouts](/payments/abandoned)
- [Tax facts and retention](/payments/tax-and-retention)
- [Reference](/payments/reference) · [Troubleshooting](/payments/troubleshooting)
