# The price rule

<AddonHeader />

[Payments](/payments/) is built on one rule:

> **The amount is looked up in the catalogue. It never comes from a request.**

An offer's own price bends that rule in the only safe direction: it lives in a table, on the
server, decided by whoever runs the site. Nothing about it is reachable from a browser.

## How it is wired

```php
Catalogue::extend(function (string $handle): ?array {
    // offer:fruehling-upsell → the offers table
});
```

The payment addon asks its own configured products first. Only when nothing matches does it
ask the resolvers. So **the configured catalogue always wins**: an addon may add handles,
never reprice one the site has already decided about.

An offer therefore resolves like any other product, and every guard already in the payment
addon applies to it unchanged — the integer check, the all-or-none rule on multi-line
checkouts, the quantity bounds, the single-currency rule.

Registered in the service provider's `register()`, not `bootAddon()`. Registration in
`bootAddon()` runs only when the addon is discovered through the manifest, and an offer that
resolves to nothing looks like a missing product rather than a missing registration.

## The prefix is load-bearing

```php
app(Checkout::class)->start('offer:fruehling-upsell', $buyer);
```

Without the prefix, an offer named after a product could quietly reprice it — and the
checkout would charge the wrong amount with no sign that anything was wrong.

`{{ offers:show }}` yields `buy_handle` with the prefix already applied, which is the way to
never have to think about it. Building the handle by hand in three templates is how one of
them ends up without it.

An **empty** `handle_prefix` is not honoured; it falls back to `offer:`. "No prefix" is
never what anybody meant.

## An offer cannot point at another offer

The offer form validates `product` against the handles in `statamic-payments.products`, and
the resolver refuses to re-enter itself.

Both guards exist because of the same bug: a pair of offers pointing at each other asked
each other what they cost until memory ran out — and the listing you would have deleted one
from died with it, because every row asks whether it is sellable.

## What a coupon does not change

A coupon is the one thing that looks like an exception to the rule and is not.

What arrives from the browser is a **code**. What the code is worth is looked up in the
`offer_coupons` table. A request that says "20 % off" is ignored; a request that says
`FRUEHLING` is a question the table answers.

The resulting `Discount` is handed to `Checkout::start()` by server-side code, and the
checkout clamps it anyway — never more than the total, never negative — because a bug
upstream should cost a wrong price, not a payment the provider rejects. See
[Coupons](/offers/coupons).

## Where the price actually comes from

In order:

1. the offer's own `amount_cent`, if it has one;
2. otherwise the product's `amount_cent` from the catalogue;
3. otherwise nothing — and the offer is not sellable.

The currency follows the same ladder: the offer's, then the product's, then
`statamic-payments.currency`.

::: tip An own price cannot be zero
The form takes `amount_cent` as a nullable integer with a minimum of 1. A free thing is a
product priced at `0` in the catalogue, which the payment addon supports deliberately — an
offer with an *empty* price inherits that zero and is free. What is refused is an offer
that types `0` as its own price, which is indistinguishable from an empty field having gone
wrong.
:::

## Reading a price back

```php
$offer->amountCent();      // int|null — its own, or the catalogue's
$offer->amount();          // "29.00" — machine-readable, always a dot
$offer->amountLocal();     // "29,00" in a German locale, with ext-intl
$offer->compareAt();
$offer->compareAtLocal();
```

`amount()` is public API and goes into JSON: it is always a dot and always two decimals,
whatever the site's locale. Anything that parses should keep using it.

`amountLocal()` is for something a person reads. A German page printing `249.00 EUR` is not
merely styled oddly — in that language the dot groups thousands, so it reads as a different
number. Without `ext-intl` the local pair falls back to the dot rather than guessing.
**1.2.0.**
