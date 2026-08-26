# Troubleshooting

<AddonHeader />

## A payment was paid and no invoice appeared

That is the designed behaviour whenever a document cannot honestly be written. The payment
stands; the invoice waits for a person.

```bash
php artisan invoices:pending
```

The listener catches the failure and **logs a warning** rather than letting it escape — an
exception there would roll back a fulfilment that went right and have the provider deliver
the whole webhook again, for a problem no retry solves. So `laravel.log` is where the reason
is.

The usual reasons, in order of likelihood:

1. **No tax class** for the product handle (`unknown_product_class`).
2. **No `digital` key** on the product, in `config/statamic-payments.php`.
3. **No buyer country** — a payment from before `statamic-payments` 1.9.0.
4. **No seller name or address** in `config/invoices.php`.
5. **No zone** covering the buyer's country, and no `'*'` placeholder.
6. On a multi-brand installation: **no current brand**.

## The invoice total is higher than what the buyer paid

`tax.prices_include_tax` is `false`, which treats the amount on the payment as **net** and
adds tax on top.

A consumer-facing shop quotes gross prices. Set it to `true`.

This is the single most likely misconfiguration on a first install, and it does not announce
itself: every invoice is internally consistent and disagrees with its payment.

## `invoices:pending --write` stopped with an exception

It catches `RateUndetermined` and moves on; it does not catch the others. A missing seller
block, a product without `digital`, or an unknown brand will stop the run.

Fix the one it named, then run it again. Everything it already wrote stays written.

## `No tax rule matched for payment …`

`RateUndetermined`. The line-by-line reasons are in the exception and in
`invoices:pending`. Each maps to something absent from `config/invoices.php`:

| Code | Add |
| --- | --- |
| `unknown_product_class` | the handle to `tax.product_classes`, or set `default_product_class` |
| `no_zone_for_country` | a zone covering that country, or a `'*'` placeholder zone |
| `no_rate_for_product_class` | that class to the zone's `rates`, as an integer |
| `implausible_rate` | basis points, not percent: `1900`, not `19` |
| `missing_country` | nothing you can add retroactively — see below |
| `invalid_country` | the payment holds something that is not ISO 3166-1 alpha-2 |
| `vat_id_country_mismatch` | the VAT ID and the country contradict each other; one of them is wrong |
| `exemption_without_reason` | a `reason` on that exemption |
| `exemption_outside_domestic` | a decision: the exemption is marked domestic-only and the buyer is abroad |

## `missing_country` on old payments

Payments taken before `statamic-payments` 1.9.0 have no `country`, and it cannot be
reconstructed: the buyer's address may have changed, and "we looked it up later" is not
evidence.

```php
'assume_country_when_missing' => 'DE',
```

is available, and it records a note on every result saying the assumption was the operator's.
Set it **only** if you know every one of those payments was domestic. Otherwise those
payments are ones to invoice by hand.

## `The product '…' does not say whether it is 'digital'`

`ProductIncomplete`. Add it in the **payments** config:

```php
// config/statamic-payments.php
'kurs' => ['name' => '…', 'amount_cent' => 9900, 'digital' => true],
```

There is no default, because the answer decides between four different mandatory statements
— reverse charge against intra-community supply, outside scope against export — and a
default would print one of them on a record shipped in a box.

## A line whose product is an offer

An [offer](/offers/) line's handle is `offer:something`, and that handle has no entry in
`statamic-payments.products` — so it has no `digital` key, and usually no tax class either.
The invoice is refused.

Adding the prefixed handle to the products config does not fix it: the payment catalogue
prefers a configured entry over a resolver, and an entry with no valid `amount_cent` makes
the offer unbuyable instead.

Today that means an order sold through an offer is one to invoice by hand. Worth knowing
before you launch a site that sells through offers and needs invoices.

## `No brand is current`

`BrandUnknown`, on a multi-brand installation. `currentId()` is not usable here: it falls
back to the default brand, and nothing is current in a provider's webhook or a console
command — so a second brand's invoice would land silently in the first brand's series, and
it is immutable a moment later.

```php
BrandContext::runFor($brand, fn () => Invoices::forPayment($payment));
```

A brand cannot be read off the payment: [Payments](/payments/) does not scope by one.

## `Brand … has no invoice prefix of its own`

`SeriesWouldCollide`. Two brands sharing a prefix hand out `RE2026-08-001` twice; the first
wins and the second dies on the unique index, on an order somebody already paid for.

```php
'prefix_per_brand' => [3 => 'CW', 4 => 'HM'],
```

Deriving a prefix from the brand handle would have been a guess that silently renumbers an
installation the day it adds a brand.

## `Unknown key(s) in the tax config`

`TaxRules` refuses a key it does not know, including a stray sub-key inside `small_business`
and `oss`. That is deliberate: a misspelt key would quietly leave its default in place, and
a default is exactly what this class exists not to fall back on.

The message names the keys it does know.

`'small_business' => true` is accepted as shorthand for
`['enabled' => true]`. So is `'oss' => true`.

## An invoice cannot be edited

Correct. `update()` and `delete()` throw, on the head and on every line, and a line cannot be
added outside the writer.

A correction is [a credit note plus a new document](/invoices/credit-notes). That is what
makes the series usable as evidence.

## Two invoices for one payment

Not possible since 1.0.0: `unique(payment_id, kind)`. Before it, the duplicate check sat
before the transaction and the index it relied on did not exist — `constrained()` creates a
foreign key, not a unique one. Five concurrent calls on MySQL produced `-001` and `-002` for
the same €244.

If you are seeing it, you are on a build without that migration.

## A number was skipped

A number is only ever taken **inside** the transaction that writes the invoice, and a failed
write takes its number back with it, so an ordinary failure leaves no gap.

What does leave one: deleting a row directly in the database. The model refuses, which is
the only protection there is.

Check `invoice_counters` before assuming: `last_number` is the truth about how many have been
handed out in that series.

## Deadlocks under load

Expected, and handled. A locked counter row is a deadlock on MySQL and a "database is
locked" on SQLite; the transaction runs with **three attempts**, because both are a reason
to try again rather than to leave a paid order without a document.

If three is not enough, the contention is somewhere else — a long transaction elsewhere
holding the counter row is the usual cause.

## The printed line does not add up

It should: unit × quantity − discount equals the net below it. The unit price is rounded
**up** and the remainder lands in the discount column, on purpose, because ordinary rounding
printed "3 × €8.40" above a net of €25.21.

A rounding cent in the discount column is the honest half of that trade: the buyer really
did pay less than unit × quantity.

## A single net line over two rates

Not what the addon prints. The totals block repeats *Entgelt zu X %* and *Umsatzsteuer X %*
per rate, because § 14 Abs. 4 Nr. 8 UStG requires the breakdown — and that case is the normal
one here, as soon as sheet music sits beside a course.

If your published template shows one line, it predates that change or was edited. See
[Delivery and storage](/invoices/delivery#publishing-the-template).

## The mandatory note is missing

`tax_note` is empty when every line is an ordinary domestic rate — deliberately, because
"Umsatzsteuer 19 %" is already in the table and repeating it below adds noise to the one
place a reader looks for an exception.

If a reverse-charge or § 19 note is missing, the mechanism was not what you expected. Check
`tax_reason` on the invoice and the rules in [VAT](/invoices/vat#the-decision-in-order).
