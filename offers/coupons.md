# Coupons

<AddonHeader />

**Utilities → Coupons** is where a code and what it is worth are decided.

This is the one place that looks like an exception to
[the price rule](/offers/price-rule) and is not. What arrives from the browser is a **code**,
and what the code is worth is looked up in a table. A request that says "20 % off" is
ignored; a request that says `FRUEHLING` is a question this table answers.

## What a coupon holds

| Field | |
| --- | --- |
| **Code** | unique, no whitespace. Matched however it is typed — `FRUEHLING` and `fruehling` are the same coupon |
| **Name** | for you, and for the line on the receipt |
| **Percent off** | 1 to 100 |
| **Amount off** | in minor units, so `500` is 5.00 |
| **Currency** | only for a fixed amount |
| **Only for these offers** | empty means every offer |
| **From** · **Until** | both optional |
| **Maximum uses** | empty means no limit |
| **Active** | |

**Exactly one of percent and amount.** Not both, not neither — the form says so, and the
model treats a coupon with neither as not live. The check lives in PHP rather than in a
database constraint because SQLite cannot express it, and a constraint that exists on one
engine is worse than none.

<Figure
  src="offers-coupons"
  alt="The Coupons listing with percentage and fixed-amount codes, validity windows and redemption counts"
  caption="Codes people type to pay less, with the window and the number of redemptions each one has left." />

## Many codes at once

**Generate codes**, the second action on the screen, makes up to 100 codes in one go: an
optional prefix (up to 12 characters), a random part of 6 to 12 characters, one use per code
unless you say otherwise, and the same discount, window and offer list a single coupon has. A
name pattern with `{n}` numbers them.

The random part comes from an alphabet without `0`/`O`/`1`/`I`/`l`. Codes are read off a slide
and typed on a phone, and a code that an attentive person can mistype is a support ticket.

**All or none.** The batch is one transaction. A code that collides with an existing one is
tried again; ten misses on one slot abort the whole batch with an error, because a sheet handed
to a partner that says a hundred and holds ninety-three is the one outcome nobody can act on.

The dates are in the application's timezone, which the form names next to the fields.

```bash
php artisan offers:coupons:generate --count=50 --prefix=CHOR- --percent=15 --until=2027-03-31
```

## Live, or not

A coupon applies when all of these hold:

- it is active,
- `starts_at` is not in the future,
- `ends_at` is not in the past,
- it has uses left,
- it actually names a percentage or an amount,
- and it [applies to](#limited-to-certain-offers) the offer in the basket.

The Coupons screen has two filters for exactly this pair of questions: **Active**, and
**Valid right now**. The second is a query scope, so the pager counts the rows the filter
left rather than the rows before it.

Two row actions, available in bulk: **Activate** and **Deactivate**.

## What it does to a price

```php
$coupon->apply($amountCent, $currency);   // the price after the discount
```

- A percentage over 100 is clamped. That is a typo somebody made in the Control Panel, not
  an instruction to pay the buyer.
- A fixed amount larger than the price makes the price zero, not negative. Fifty euros off a
  twenty-euro offer is a free offer, not a refund.
- **A fixed amount in the wrong currency is not applied at all.** Taking 10 off a price in
  another currency is arithmetic that means nothing. A percentage has no such problem, which
  is why it has no currency field.

## Limited to certain offers

Leave **Only for these offers** empty and the code works on every offer, which is the useful
default for a campaign code. Name offers and it works on those and no others.

The check runs against the offer the basket was built around — the primary one, not the
bumps.

## Redemptions are claimed, not counted

`used_count` is incremented with a conditional `UPDATE`, at the moment a basket becomes a
payment.

Two consequences, both deliberate:

**Typing a code does not use it up.** Somebody who types `FRUEHLING` and closes the tab has
used nothing. The claim happens in `Basket::discount()`, which is what a controller calls on
its way into `Checkout::start()`.

**The last use cannot go to two people.** The conditional update is what makes that true
under concurrency — a read-then-write check would hand the last one to both. And if somebody
else took it in between, **the sale still happens, at full price**: a sale lost to a race is
worse than a discount missed.

## On the payment

The payment records `discount_code` and `discount_cent`, so an old receipt keeps saying what
came off even after the coupon is edited, exhausted or expired.

It is also **split across the lines**, proportionally to line value, which is what makes an
invoice possible when the lines sit at different tax rates. See
[Tax facts and retention](/payments/tax-and-retention#the-discount-per-line).

Deleting a coupon deletes the record of how often it was used. It does not touch a single
payment: what came off an order is on the order.

## A trial and a coupon cannot both apply

`Checkout::start()` takes one `Discount`, and a
[trial](/payments/subscriptions#trials-and-the-trade-they-involve) already uses it. That is
a real limitation rather than an oversight: two reductions on one line need a rule about
which comes off first, and inventing that rule quietly is how a receipt ends up saying
something nobody can reproduce.
