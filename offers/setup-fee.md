# Setup fee and countries

<AddonHeader />

Two conditions on an offer that say what the first payment costs and who may buy at all.

## Setup fee

On an offer with a rhythm (a subscription or instalments), **Setup fee** is charged once,
with the first payment.

- **Its own line.** The fee is bought as `offer:<handle>:+setup`, so the invoice lists it as a
  position of its own, labelled with **Name on the invoice**, or "Setup fee: " and the offer's name when that is
  empty.
- **Tax like the product.** The line inherits the product's tax facts.
- **No rhythm, no grants.** It is charged once and hands out nothing.
- **Never discounted.** A coupon takes nothing off the setup fee.
- **Only where there is a rhythm.** With several payment options, the fee applies only when the
  chosen option has one.

It counts as revenue of its offer, but not as a unit sold: a quantity limit of ten is still ten
buyers, not five buyers and five setup fees.

`Offer::firstPaymentCent()` is the number to show as "due today". The tag yields it as
`first_payment_cent`, next to `setup_fee_cent` and `setup_fee_name`.

::: tip A lower first payment is something else
A setup fee makes the first payment higher. A *lower* first payment is the paid trial that
already exists in [Payments](/payments/subscriptions#trials-and-the-trade-they-involve):
`trial_days` plus `trial_amount_cent` on the payment option.
:::

## Availability by country

**Available in** has three settings:

| Setting | |
| --- | --- |
| **Worldwide** | the default |
| **Only these countries** | a list of two-letter ISO codes |
| **Everywhere except these countries** | the same list, read the other way round |

Choosing a restriction with an empty list saves **Worldwide**.

The rule is enforced in the basket:

```php
Basket::make($offer, country: 'DE');
```

A country outside the rule throws `OfferNotAvailable`, with `buyerMessage()` for the form.
**So does a missing country while a rule exists.** A rule that only holds for buyers who
volunteer their country is not a rule, so a checkout selling a restricted offer has to ask for
it. The refusal is logged with the offer, the country and the mode.

A bump restricted elsewhere is not an error: it quietly drops out of the basket, like a bump
that is not sellable.

The tag yields `country_mode` (`all`, `only`, `except`) and `countries`, so a checkout knows
whether to ask. Sibling addons ask:

```php
\Goldnead\StatamicOffers\Offers::availableIn('offer:workshop', 'CH');
```

[Payments](/payments/) newer than 1.24.5 asks the same question before it starts a checkout for
an offer handle, so a checkout that skipped the basket is refused too. On an older Payments the
basket is the only guard.
