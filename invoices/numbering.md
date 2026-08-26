# The number

<AddonHeader />

German law wants a series that is unique **and** continuous. Both of those are properties of
**concurrency**, not of arithmetic.

Two checkouts finishing in the same millisecond both read the same maximum and both write
the same number, and neither notices. A unique index turns that into an exception — better
than a duplicate, but it happens after somebody has already paid, and the retry has to be
built anyway.

So the number does not come from `MAX() + 1`. It comes from a **counter row that is locked
while it is incremented**, inside the same transaction that writes the invoice. Two
processes queue; nobody gets the same number; nothing is skipped.

## A number is only ever taken inside the transaction

`NumberSeries::take()` throws if it is called outside one. That is not defensive
programming — a number handed out to something that then fails leaves a **gap**, and a gap
in a German series is a question at the next audit rather than a cosmetic issue.

The lock has to be held until the invoice row exists, which is also why the method does not
open a transaction itself: committing on its own would release it a moment too early.

## The format

```php
'number' => [
    'prefix' => 'RE',
    'period' => 'Y-m',   // monthly. 'Y' yearly, '' never restarts
    'separator' => '-',
    'pad' => 3,
],
```

`RE` + `2026-08` + `-` + `001` → **`RE2026-08-001`**.

`period` is a date format string, applied to the invoice's issue date.

## Changing the format renumbers nothing

The **resolved series** — the literal string `RE2026-08`, not the pattern — is stored on the
counter row. A site that switches from monthly to yearly next January starts a new counter
and leaves every old invoice in the series it was issued in.

That is the whole reason the string is stored rather than computed on read.

## One series per brand

The counter is keyed on `(brand_id, series)`, and `0` stands for "no brand" — a unique index
does not bind on `NULL`, so two counter rows for the same series would otherwise slip
through on every installation without [Brand Context](/brand-context/), which is most of
them.

Two brands sharing a counter each end up with a series full of holes from their own point of
view, and it is each brand that has to answer for its own numbering.

But the **number itself is globally unique** — that is what makes it evidence. Put those two
together with a shared prefix and two brands hand out `RE2026-08-001` twice: the first wins,
and the second is an exception on an order somebody already paid for.

So a multi-brand installation must give each brand its own prefix:

```php
'prefix_per_brand' => [3 => 'CW', 4 => 'HM'],
```

A brand without one raises `SeriesWouldCollide` **before** anything is written. Deriving a
prefix from the brand handle would have been a guess that silently renumbers an installation
the day it adds a brand, and a number series that changes shape is one nobody can explain to
an auditor.

## Which brand is it, though

Not `BrandContext::currentId()`. That falls back to the default brand when nothing is set —
and nothing is set in a provider's webhook or in a console command, which is exactly where
invoices are written. A second brand's invoice would land silently in the first brand's
series, and it is immutable a moment later.

A brand is not recoverable from the payment either: [Payments](/payments/) does not scope by
one, deliberately, because a payment is a transaction rather than content.

So on a multi-brand installation with no current brand, the invoice is **refused**
(`BrandUnknown`) and somebody has to say which brand sold this:

```php
BrandContext::runFor($brand, fn () => Invoices::forPayment($payment));
```

On a single-brand installation, or one without Brand Context at all, `brand_id` is `0` and
none of this applies.

## One invoice per payment

Enforced by a unique index on `(payment_id, kind)`, not by looking first.

Looking first does not work: two webhook deliveries arriving together both look, both see
nothing, and both write. That was demonstrated on MySQL before 1.0.0 — five concurrent calls
produced `RE2026-08-001` and `-002` for the same €244.

The index also allows exactly **one credit note** per payment, for the same reason.

The transaction runs with **three attempts**, because a locked counter row is a deadlock on
MySQL and a "database is locked" on SQLite, and both are a reason to try again rather than to
leave a paid order without a document.

## What the number is not

It is not an id, not a URL slug and not something to sort by. The `id` column is the
identifier; the number is the *evidence*, and its only job is to be unique, continuous, and
the same forever.
