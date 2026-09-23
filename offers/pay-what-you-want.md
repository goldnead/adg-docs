# Pay what you want

<AddonHeader />

An offer can let the buyer choose the amount. It has a **minimum**, a **suggestion** and an
optional **maximum** instead of a price, and the checkout asks for a number.

<Figure
  src="offers-pwyw-editor"
  alt="The offer form set to pay what you want, with minimum, suggestion and maximum in cents, the amounts they stand for below, and a thank-you text per threshold"
  caption="Minimum 1000, suggestion 2500, maximum 20000: every money field is in cents and says what it stands for underneath." />

## The one number that comes from the buyer

[The price rule](/offers/price-rule) says an amount never comes from a request. Pay what you
want is the single place where it does, and it is believed only **inside the bounds the
offer sets**.

The chosen amount travels in the catalogue handle:

```text
offer:workshop:=2500
```

The catalogue resolves that handle only when the amount fits. It refuses:

- an amount below the minimum or above the maximum,
- a malformed amount: `=01500`, `=10.50`, `=-1`,
- any amount at all on a fixed-price offer.

So [Payments](/payments/) needs no change. The checkout looks the handle up like any other and
charges what the catalogue says, and a handle the catalogue refuses starts no checkout.

## In a controller

```php
use Goldnead\StatamicOffers\Support\Basket;

$basket = Basket::make($offer, amountCent: (int) $request->input('amount_cent'));
```

Outside the bounds, `Basket::make()` throws `AmountNotAccepted`, an
`InvalidArgumentException` with `buyerMessage()` for the form. Without an amount, the
suggestion is used.

The tag hands a template the bounds for the input field: `pay_what_you_want` (boolean),
`pwyw_min_cent`, `pwyw_suggested_cent` and `pwyw_max_cent`. Those are only for pre-filling
the field. The server checks the amount again, whatever the form allowed.

## The bounds

| Field | |
| --- | --- |
| **Minimum** | in cents, `0` allowed. Empty is saved as `0` |
| **Suggested** | in cents, pre-filled at checkout |
| **Maximum** | in cents, optional |

Without a maximum of its own, `pay_what_you_want.max_cent` from the
[configuration](/offers/configuration) caps the amount, by default `500000` (5,000.00). That
is not a price recommendation. It stops a typo with three zeros too many from becoming a charge.

## The minimum is a floor after discounts too

A coupon takes at most the part of the chosen amount **above the minimum**, plus the bumps
when the coupon applies to the whole basket. Somebody who chooses the minimum and types a
coupon still pays the minimum.

The floor travels to the renewals: on a subscription, the coupon terms handed to the payment
carry `floor_cent`, and `Offers::recurringDiscountCent()` does not take a renewal below it
either. See [Coupons → Duration](/offers/coupons#how-long-a-coupon-applies).

## Subscriptions

A subscription at a chosen amount charges that amount every cycle, because the renewals read
the same handle.

Pay what you want does not combine with several payment options on one offer. The form refuses
the combination.

## Thank-you tiers

Optional: a text per threshold, and the highest tier the paid amount reaches wins.

```php
$offer->thankYouFor(6000);
\Goldnead\StatamicOffers\Offers::thankYouFor('offer:workshop:=6000');
```

```antlers
{{ offers:thanks handle="workshop" amount_cent="6000" }}
```

`handle` may also be the catalogue handle with the amount (`offer:workshop:=2500`), and then
needs no `amount_cent`. The tag prints nothing when no tier matches. Up to twelve tiers, each
text up to 2000 characters.
