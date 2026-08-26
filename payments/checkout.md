# Starting a checkout

<AddonHeader />

```php
use Goldnead\StatamicPayments\Support\Checkout;

$checkout = app(Checkout::class)->start('noten-paket', [
    'email' => $request->input('email'),
    'name' => $request->input('name'),
]);

abort_if($checkout === null, 404);          // nothing sellable under that handle

$checkout->payment;                          // the row
return redirect()->away($checkout->checkoutUrl);
```

`start()` returns a `CheckoutResult` — the payment row and a URL — or `null`. Two values
rather than a checkout URL glued onto the model, because an attribute without a column
survives until somebody calls `save()` and then throws on a column that does not exist, at
the worst possible moment.

## The signature

```php
start(
    string|array $products,
    array $buyer = [],
    ?string $returnUrl = null,
    ?Discount $discount = null,
): ?CheckoutResult
```

## What the buyer sends, and what is done with it

| From the request | Used as |
| --- | --- |
| the product handle(s) | a **lookup key** in the catalogue |
| the quantity | a bounded integer, checked against the product's own limits |
| email, name, country | labels on the order |
| a price | **never** |

Everything the buyer supplies is a label on the order, not a term of it — including *which*
things they are buying. A handle that is not in the catalogue does not make the payment
smaller, it refuses the checkout.

## Lines, not one product

A payment carries lines. A checkbox at checkout adding a second item is one payment with
two lines, never two payments:

```php
app(Checkout::class)->start(['noten-paket', 'uebungsblaetter'], $buyer);
app(Checkout::class)->start(['noten-paket' => 1, 'uebungsblaetter' => 3], $buyer);
```

The first handle is what the buyer came for and is marked `primary`; the rest are `bump`.
That handle also stays on the payment itself, so a report can group by it without joining a
table.

A handle listed twice is a quantity, not a second line: `['noten' , 'noten']` is one line of
two.

## All or none

A handle that is not in the catalogue **refuses the whole checkout**. So does a quantity
outside the product's bounds, and so do two currencies in one basket.

Dropping the bad line would charge the buyer for less than the page offered, and the first
anyone hears of it is a customer who paid for two things and got one. The refusal is a
`null` return, which is why the `abort_if` above is not optional.

## The order things happen in

1. The lines are priced from the catalogue and the total is worked out.
2. A discount, if there is one, is clamped and subtracted.
3. **The row is written**, with a placeholder provider id and status `initiated`.
4. The provider is called.
5. The row is updated with the real provider id and status `open`.

The row exists **before** the provider is called, deliberately. The other order — provider
first, row second — loses the payment entirely if the process dies in between, and the
buyer has by then been charged.

`initiated` rather than `open` for step 3 is the same care: until the provider has
answered, this is not a payment anybody can make, and every report over `status = open`
would otherwise count it as an order in flight.

## The buyer array

```php
app(Checkout::class)->start(['kurs'], [
    'email' => 'wer@example.com',
    'name' => 'Wer Auch Immer',
    'country' => 'AT',
]);
```

| Key | Stored as |
| --- | --- |
| `email` | `payments.email` |
| `name` | `payments.name` |
| `country` | `payments.country`, normalised to ISO 3166-1 alpha-2, plus `country_source = checkout` |

Anything that is not two letters is **dropped rather than stored**: a column that holds
"Deutschland", "DE" and "de" is one nobody can compute a tax rate from, and a wrong rate
looks like an answer. Where the checkout has no country, fulfilment fills the gap from the
provider and `country_source` names it instead. See
[Tax facts and retention](/payments/tax-and-retention).

An address the buyer typed is never overwritten by the one on their Mollie account. Those
are often different people.

## Where the buyer comes back to

```php
app(Checkout::class)->start('kurs', $buyer, '/kurs/danke');
```

Defaults to `return_url` in the config, with `?payment=<id>` appended. A flow that owns its
own pages passes its own, because a buyer who returns outside the flow they were walking
has been dropped halfway through a purchase and whatever was meant to follow the sale never
happens.

The URL is checked against this application. An external one is **dropped** — logged, and
replaced by the configured page — rather than refused: the buyer has paid by the time this
is read, and failing the checkout over a bad return address would take their money and show
them an error.

Protocol-relative URLs (`//evil.example`) count as external, which a naive prefix check
waves through. Both `app.url`'s host and the host of the running request are accepted, so
an installation behind several domains does not send a paying customer to the wrong one.
**1.11.0.**

::: danger The return URL proves nothing
A buyer who closes the tab still paid. A buyer who reaches the thank-you page has not
necessarily paid. Fulfil on [the event](/payments/events), never on the page.
:::

## A discount

```php
use Goldnead\StatamicPayments\Support\Discount;

app(Checkout::class)->start(
    ['kurs', 'begleit-cd'],
    ['email' => $email],
    $returnUrl,
    new Discount(code: 'FRUEHLING', amountCent: 2500),
);
```

This addon knows nothing about coupons and should not: what a code is worth, who may use it
and how often are questions about pricing, and pricing lives in
[Offers](/offers/coupons). What lives here is the consequence — the payment records
`discount_code` and `discount_cent`, so an old receipt keeps saying what came off even
after the coupon is edited or expires.

A `Discount` is built by server-side code that looked something up, never from input. The
checkout clamps it anyway — never more than the total, never negative — because a bug
upstream should cost a wrong price, not a payment the provider rejects.

**The discount is also split across the lines**, proportionally to line value, and stored
per line. That is not for this addon's benefit; it is what makes an invoice possible when
the lines sit at different tax rates. See
[Tax facts and retention](/payments/tax-and-retention#the-discount-per-line).

## A free checkout

If the total comes to zero — a product priced at `0`, or a discount that covers everything
— the provider is never called. The payment is marked paid, fulfilment runs, and
`CheckoutResult` carries the return URL instead of a provider's page.

A provider will not take a payment of nothing, and a free offer that failed at the checkout
would be the most confusing possible outcome: the buyer was told it costs nothing and then
told it did not work.

## Remembering the buyer

With `follow_up.collect_mandate` on, the checkout also asks the provider to remember the
buyer's payment method and stores the reference on the payment. That is what makes a
[follow-up offer](/payments/bumps) or a [subscription](/payments/subscriptions) possible
later.

A failure here does **not** fail the checkout: the buyer is trying to pay for something,
and losing that sale because a later, optional offer could not be prepared would be the
wrong trade. It is logged and the checkout continues without a mandate.

::: warning It has to be on the page
Asking a provider to remember somebody's payment method is a thing that person has to be
told about, on the checkout page, in plain words. The flag exists so that this addon does
not decide it for every site that installs it.
:::
