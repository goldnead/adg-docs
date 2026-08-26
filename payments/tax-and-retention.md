# Tax facts and retention

<AddonHeader />

Two facts are recorded at checkout because they cannot be recovered afterwards, and one
kind of row is deleted because keeping it needs a purpose nobody can name.

Neither is here for this addon's own benefit. Both exist because of what happens next.

## The buyer's country

```php
app(Checkout::class)->start(['kurs'], [
    'email' => 'wer@example.com',
    'country' => 'AT',
]);
```

| Column | |
| --- | --- |
| `country` | ISO 3166-1 alpha-2, **frozen on the payment** |
| `country_source` | `checkout` when it came from the buyer array, otherwise the provider's name |

**Frozen, not referenced.** Not a pointer to a customer record that changes later: the VAT
rate on a digital sale to a consumer in the EU depends on the buyer's country at the time
of supply, and an order that changes when a customer edits their profile is not an order,
it is a view.

Anything that is not two letters is **dropped rather than stored**. A column that sometimes
holds "Deutschland", sometimes "DE" and sometimes "de" is one nobody can compute a rate
from, and a wrong rate is worse than a missing one because it looks like an answer.

If the checkout has no country, fulfilment fills the gap wherever the provider recorded one,
and `country_source` names the provider instead of `checkout`. That distinction matters: the
EU asks for two non-contradictory pieces of evidence for a consumer's location, and "the
card issuer said so" is worth more than "somebody typed it".

## The discount, per line

A payment records **one** discount amount. An invoice has to place it across lines that may
sit at different VAT rates.

Sheet music at 7%, a course at 19%, one voucher across both — from the total alone that
split is unrecoverable, and the invoice is then not visibly wrong but *indeterminate*, which
is the worse of the two.

`payment_items.discount_cent` carries the share that fell on each line.

**The rule: proportional to line value.** It is what tax offices expect, it needs no
knowledge of what the discount meant, and it gives the same answer for a fixed amount and
for a percentage — a 20% voucher and its resulting euro figure distribute identically,
which is what makes the rule safe to apply after the fact.

**The rounding rule, named rather than left to chance:** distribute by integer division,
then give every remaining cent to the largest lines first, so the parts always add up to the
whole. The alternative — rounding each share and hoping — either loses a cent or invents
one, and an invoice whose lines do not add up to its total is an invoice somebody has to
explain.

## Old rows keep `null` and `0`

Both columns arrived in **1.9.0**. Payments taken before it keep `null` for the country and
`0` for the line discounts.

That is the honest state — they were taken without this being recorded — and everything
downstream has to tolerate it rather than guess. [Invoices](/invoices/vat) does exactly
that: no country means no invoice, rather than an invoice at the seller's own rate.

::: tip The point of 1.9.0 was timing, not schema
Every real sale that happened before it is a row that can never be invoiced correctly. If
you intend to issue invoices at all, upgrade before you start selling, not after.
:::

## One more thing an invoice needs

Not a column: a key on the product.

```php
'noten-paket' => [
    'name' => 'Notenpaket „Frühling"',
    'amount_cent' => 1900,
    'digital' => false,      // a physical thing in a box
],
```

This addon never reads `digital`. [Invoices](/invoices/vat#digital-or-physical) does, and it
refuses to write a document for a product that does not say — because the answer decides
between four different mandatory statements, and a default would print one of them on a
record shipped in a box.

## Deleting checkouts that were never paid

```php
// config/statamic-payments.php
'prune_unpaid_after_days' => 30,
```

```bash
php artisan payments:prune-unpaid --dry-run
php artisan payments:prune-unpaid
```

**The reason is not tidiness.** A paid order carries a retention *obligation*; an abandoned
checkout carries the opposite — what sits in the row is the name and email address of
somebody with whom no contract was ever concluded, and keeping that indefinitely needs a
purpose nobody can name.

Deleted rather than anonymised: an anonymised record with no purpose is still a record.

`0` switches it off, which is the default. Pick a number that fits how long a reminder
sequence may still be running; 30 is a common one, and it is your decision rather than this
addon's.

### What is never touched

| Left alone | Because |
| --- | --- |
| anything with `paid_at` or `fulfilled_at` | it is an order |
| anything with a refund recorded | the same |
| `failed`, `expired`, `canceled` | a failed attempt may still be a question later |
| anything with `abandoned_notified_at` set | an automation whose trigger vanishes underneath it fails halfway through |

That last row is worth reading twice: a checkout that has **ever** been announced as
abandoned is never pruned, not merely while a sequence is running. If you switch abandoned
sweeps on, expect those rows to stay until you delete them another way.

The command works in chunks, because the first run on an existing installation meets every
old open checkout at once. `payment_items` goes with the payment.

## What this addon does not decide

It records facts. It does not calculate a tax rate, does not know what a
Kleinbetragsrechnung is, and does not have an opinion about the OSS threshold. That is all
[Invoices](/invoices/vat) — and it is a separate addon precisely so that a site that does
not need invoices does not carry a tax engine.

Retention beyond these rows is your policy, not the addon's. See
[Privacy & retention](/guide/privacy).
