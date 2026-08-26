# Offers

<AddonHeader />

A product, a price of its own, the words that sell it, and where it appears.

## An offer is not a product

A **product** is a thing that exists and costs money. An **offer** is that thing
*presented*: at a place, for a price that may be its own, with words that are about this
moment.

The same product is a €29 purchase on the sales page and a €12 upsell on the thank-you
page. Those are two offers, one product — and the second one is the reason this addon
exists at all.

[Payments](/payments/) has a catalogue, and a catalogue is a price list. It has one price
per handle, it lives in a config file, and it has nowhere to put a headline. That is
correct for what it is. Everything a *presentation* needs — a second price, a struck-through
comparison, a slot, an image, a counter — is what this table adds.

## What you get

- **Offers in the Control Panel** — handle, product, price, headline, body, image, button
  label, slot, active
- **A price of its own**, or the catalogue's when it has none
- **A compare-at price**, display only and never charged
- **Slots**: at checkout, after a payment, or anywhere a template asks
- **Bumps** — the offers this one carries as checkboxes at checkout, in the order you picked
  them
- **Coupons** — a code, a percentage or an amount, limited to offers, to a date range, to a
  number of redemptions
- **Two counters per offer**: shown, and accepted — where accepted means **paid**
- **Two Antlers tags**, `{{ offers:show }}` and `{{ offers:slot }}`

## It rides on the payment catalogue

An offer resolves through `Catalogue::extend()`, the seam Payments provides for exactly
this. So `offer:fruehling-upsell` is looked up like any other product, and every guard the
payment addon already has applies to it unchanged.

Which means **the price rule still holds**: the amount lives in a table, on the server,
decided by whoever runs the site, and nothing about it is reachable from a browser. See
[The price rule](/offers/price-rule).

Coupons look like an exception and are not. What arrives from the browser is a **code**;
what the code is worth is looked up. A request that says "20 % off" is ignored; a request
that says `FRUEHLING` is a question the table answers.

## The shortest useful path

1. `composer require goldnead/statamic-offers`, then `php artisan migrate`.
2. **Utilities → Offers**, add one: a handle, a product from the payment catalogue, and a
   price if it differs.
3. In a template, `{{ offers:show handle="…" }}` and post `buy_handle` to your own checkout
   controller.
4. `app(Checkout::class)->start('offer:'.$handle, $buyer)`.

## What it deliberately does not do

- **Take money.** It has no gateway, no webhook and no fulfilment. It contributes prices;
  [Payments](/payments/) charges them.
- **Sequence anything.** An offer knows a slot, not a journey. There is no notion of what
  comes next, no conditions, no split tests.
- **Count clicks as conversions.** Accepted means paid. An offer whose conversion rate
  counts clicks flatters itself every time a card is declined, and a number nobody can
  trust is worse than no number.
- **Reprice a configured product.** The prefix keeps the two apart, and the configured
  catalogue always wins.
- **Scope by site.** An offer is a commercial decision, not content.

## Next

- [Installation](/offers/installation)
- [Configuration](/offers/configuration)
- [An offer is not a product](/offers/concepts) — the fields, the slots, the counters
- [The price rule](/offers/price-rule) — how a second price stays safe
- [Bumps](/offers/bumps)
- [Coupons](/offers/coupons)
- [In a template](/offers/templates)
- [Reference](/offers/reference) · [Troubleshooting](/offers/troubleshooting)
