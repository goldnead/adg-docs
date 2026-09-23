# Installation

<AddonHeader />

<Requirements laravel="12.40+ or 13.x" />

```bash
composer require goldnead/statamic-invoices
php artisan vendor:publish --tag=invoices-config
php artisan migrate
```

Three tables: `invoices`, `invoice_items`, `invoice_counters`.

## What comes with it

| Package | Constraint | |
| --- | --- | --- |
| [`goldnead/statamic-payments`](/payments/) | `^1.14` | Installed automatically. Earlier versions record neither the buyer's country nor the discount per line nor the brand of the purchase, and **none of the three can be reconstructed afterwards**. |
| [`goldnead/statamic-brand-context`](/brand-context/) | `^1.11` | Installed automatically. One number series per brand instead of one for the whole installation, and the `BrandMailer` the invoice mail leaves through. |
| [`dompdf/dompdf`](https://github.com/dompdf/dompdf) | `^3.1` | Installed automatically. The bundled print engine, pure PHP — no Node, no system binary. See [Delivery](/invoices/delivery). |

Suggested, not required:

| Package | | |
| --- | --- | --- |
| [`goldnead/statamic-insights`](/insights/) | | Shows documents issued, net, gross and VAT on the Insights dashboard, split by kind, buyer country and tax rate. Detected at runtime. |

## Fill in the sender first

**Before the first invoice goes out.** A document missing the sender's details is not a
valid invoice in Germany — and it cannot be corrected afterwards, only reversed and
reissued.

```php
// config/invoices.php
'seller' => [
    'name' => 'Adrian Goldner',
    'address' => "Beispielweg 1\n60311 Frankfurt am Main",
    'vat_id' => 'DE123456789',
    'tax_number' => '01/234/56789',
    'email' => 'rechnung@example.com',
    'iban' => 'DE00 0000 0000 0000 0000 00',
],
```

`name` and `address` are checked before anything is written. The rest is printed when it is
there.

Every one of these is **frozen onto the invoice** at the moment it is written. Editing the
config next year does not rewrite last year's documents, which is the point.

## Then the tax rules

The tax block ships with Germany filled in and **everything else empty**, on purpose: a rate
that is stale is worse than one that is missing, because missing says so.

At minimum:

```php
'tax' => [
    'prices_include_tax' => true,     // see the warning below
    'product_classes' => [
        'noten-paket' => 'reduced',
        'kurs' => 'standard',
    ],
],
```

::: danger `prices_include_tax` defaults to `false`
`false` means the amounts on your products are **net**, and the invoice adds tax on top — so
its total will be higher than what the buyer was actually charged.

A shop that quotes gross prices to consumers, which is the ordinary case here, has to set
this to `true`. It is a global switch, as in Cargo, and it is the first thing to check when
an invoice total does not match a payment.
:::

Then every product needs `digital`, in the **payments** config:

```php
// config/statamic-payments.php
'products' => [
    'kurs' => ['name' => '…', 'amount_cent' => 9900, 'digital' => true],
],
```

Without it the invoice is refused. See
[VAT](/invoices/vat#digital-or-physical).

## Automatic, or on demand

```php
'auto_issue' => env('INVOICES_AUTO_ISSUE', true),
```

On by default: an invoice on every paid payment, a credit note on every full refund. Off
means the host decides when, through the `Invoices` facade — which is what an installation
wants when not every payment is a sale.

## Checking what is waiting

```bash
php artisan invoices:pending
php artisan invoices:pending --write
```

Paid payments with no invoice, and what is missing. The first form only lists; the second
writes the ones that can be written.

Run it after your first real payment. It is the fastest way to find out that a product has
no tax class before a customer does.

## No scheduler, one queued job

No scheduler is used, and writing an invoice needs no queue. An invoice is written inside
the payment's own fulfilment, in one transaction, and the whole point of the counter is that
concurrent writers queue at the database rather than in a worker.

The one queued job is the [PDF archive](/invoices/exports#the-pdf-archive) of the export,
with a timeout of 1800 seconds. **Set `retry_after` of the queue connection above 1800**, or
a second worker starts the same archive while the first is still rendering. Without a
worker, the archive waits as "being built"; the CSV and the tax report do not need one.

## Permissions

`access invoice-exports utility` for the export and `access vat-checks utility` for the VAT
ID checks, both registered by Statamic with the utilities, and `manage invoices settings` for
the section on the shared settings screen. See [Reference → Control Panel](/invoices/reference#control-panel).

## Upgrading to 2.2

Run the migration **before the next sale**:

```bash
composer update goldnead/statamic-invoices
php artisan migrate
```

The invoice writer fills two new columns on `invoice_items`, `tax_mechanism` and
`place_of_supply`. An invoice written before the migration has run fails on the missing
column. Nothing else changes for an installation that does not switch on the shipped EU
rates.

## Licence

Commercial: `composer.json` says `proprietary`. See [Licensing](/guide/licensing).
