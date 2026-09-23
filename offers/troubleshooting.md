# Troubleshooting

<AddonHeader />

## The tag prints nothing

By design, and there are four reasons:

1. **No offer with that handle.**
2. **It is not active.**
3. **It has no price** — neither its own nor one the catalogue can supply.
4. **Its product is not in the catalogue.** Removing a product from
   `config/statamic-payments.php` silently makes every offer pointing at it unsellable.

The Offers screen names the fourth: *Not sellable: the product is not in the catalogue.*

## The tag prints an empty box

`{{ if no_results }} … {{ else }}` is missing. Like every Statamic tag pair, this one parses
its block once even when there is nothing to yield, so markup outside that branch is printed
anyway.

## `Checkout::start()` returns null for an offer

Almost always the **prefix**. `start('fruehling-upsell')` looks for a *product* by that
name; `start('offer:fruehling-upsell')` looks for the offer.

Use `buy_handle` from the tag, or `$basket->handles()`, and the question does not come up.

The other causes are the ones above — an offer that is not sellable resolves to nothing, and
the checkout refuses.

## A German page prints `249.00 EUR`

`amount` from the tag is the machine-readable form: always a dot, always two decimals,
whatever the locale. That is deliberate — it goes into JSON and things parse it.

For something a person reads, use `amountLocal()` and `compareAtLocal()` on the model, or
format it in the template. Without `ext-intl` both fall back to the dot rather than
guessing. **1.2.0.**

## A ticked bump was ignored

The list on the offer is the authority. `Basket::make()` drops anything the offer does not
list, anything not placed **At checkout**, anything not sellable, and the offer itself.

That is what stops somebody adding a cheap handle to the form and buying an unrelated
product. If a legitimate bump is being dropped, check its slot and whether its product is
still in the catalogue.

## A bump refuses the whole checkout

It is not the bump list, it is the payment addon: a handle it cannot price refuses the
**whole** checkout rather than quietly dropping the line, because dropping it would charge
the buyer for less than the page offered.

That should not happen through `Basket`, which filters unsellable bumps out first. It does
happen when a template posts handles straight into `start()` without going through a basket.

## A coupon does nothing

In order:

1. Is it **active**?
2. Is today inside `starts_at` … `ends_at`?
3. Does it have **uses left**?
4. Does it name a percentage **or** an amount? A coupon with neither is not live.
5. Is the offer in its **Only for these offers** list — or is that list empty?
6. For a fixed amount: does its **currency** match? A fixed discount in another currency is
   deliberately not applied at all.

The **Valid right now** filter on the Coupons screen answers 1 to 4 in one look.

## A coupon link opens the page without the discount

A link only prefills; the code is checked when the basket is built, like a typed one. So the
same list applies as above, plus:

- **The parameter was renamed.** `coupon_link.parameter` changed after the flyer was printed.
- **The checkout does not read it.** Your own checkout has to ask
  `Offers::couponFromRequest()`, or read `Offers::couponParameter()` from the query itself.

An ignored code is logged with the reason: expired, exhausted, unknown, or not for this offer.

## A subscription coupon only took off the first payment

Either the coupon says **The first payment** (the default, and what every coupon made before
this setting existed keeps), or the installed [Payments](/payments/) does not read
`meta.coupon` yet. The renewals are lowered over there, not here. Also check that the checkout
attached `$basket->paymentMeta()` to the payment.

A coupon that only takes off bumps never touches a renewal: renewals charge the main offer.

## The buyer is told the amount is not accepted

The chosen amount lies outside the minimum and maximum. Without a maximum on the offer,
`pay_what_you_want.max_cent` caps it, by default 5,000.00. `AmountNotAccepted::buyerMessage()`
names the bounds.

A coupon never takes a chosen amount below the minimum, so "the coupon did less than it
says" on such an offer is the floor at work.

## The buyer is told the offer is not available in her country

The offer has a country rule, and either her country is outside it or **no country was
passed**. With a rule, `Basket::make()` needs the `country` argument. A checkout that never asks
for the country cannot sell a restricted offer.

## The short link answers 404

The slug is unknown, or the offer has no **Target**. A slug is lowercase letters, digits and
`-`. If a page of your site answers instead, its path starts with `links.prefix`: rename one
of them.

## The short link still leads to the first target

It switches when **Switch on** has passed (else `available_until`), or when sold out with
**Switch once sold out** on, and **only if Target afterwards is set**. Without a second target
it stays on the first by design. The offer panel says where it leads right now.

## An accepted seat gives no access

In order:

1. Is [Entitlements](/entitlements/) installed? Without it, or without your own `SeatAccess`
   binding, an accepted seat grants nothing and the log says so.
2. Does the product grant anything? A seat hands out the product's `grants`. The offer form
   warns when there are none.
3. The buyer herself gets no access from a seat purchase. That is intended: she hands out the
   seats, including one to herself if she wants one.

## A refunded purchase still has accepted seats

The access could not be revoked when the pool closed, so the seat stayed accepted and the log
says so. `php artisan offers:seats-reconcile` retries. It exits non-zero while a seat is still
open. Schedule it hourly; see [Seats](/offers/seats#schedule-the-catch-up).

A **partial** refund closes nothing. The buyer decides which seat goes.

## The last redemption went to somebody else

Then the sale still happened, at full price. `claim()` is a conditional `UPDATE`, and when
it loses the race `discount()` returns `null` rather than failing the purchase — a sale lost
to a race is worse than a discount missed.

## `used_count` rose without a sale

`discount()` claims a use, and it does that wherever it is called. If a page calls it while
**rendering** — to show "you save €5" — every page view burns a redemption.

Call it at the moment a basket becomes a payment. Use `coupon()` and `netCent()` for
display; they claim nothing.

## Saving an offer says the product is invalid

`product` is validated against `array_keys(config('statamic-payments.products'))`. Two
things this rules out, both deliberately:

- a product that is not in the config file, including one contributed by another resolver;
- **another offer**. A pair of offers pointing at each other asked each other what they cost
  until memory ran out — and the listing you would have deleted one from died with it.

## An offer line gets no invoice

[Invoices](/invoices/) reads two things off `config/statamic-payments.products` by the
line's product handle: its tax class, and whether it is `digital`. A line whose handle is
`offer:something` has no entry there, so the invoice is not written and the payment turns up
in `invoices:pending`.

Adding `offer:something` to the products config does not fix it — the payment catalogue
prefers a configured entry over a resolver, and an entry without a valid `amount_cent`
makes the offer unbuyable instead.

So today, an order whose lines are offers is one to invoice by hand. If you sell through
offers and need invoices, that is worth knowing before you launch rather than after.

## A saved offer only appears after a reload

Fixed in **1.1.0**. The listing fetches its own rows and an Inertia redirect never touches
them, so saving looked like it had failed.

## Nothing appears in the Control Panel

```bash
php artisan vendor:publish --tag=statamic-offers --force
php artisan statamic:install
```

Statamic publishes addon assets from a `statamic:install` hook in `post-autoload-dump`.
Without it, nothing publishes.

If the nav entries are there but a screen answers 403, that is the permission: `access
offers utility` and `access coupons utility` are separate.
