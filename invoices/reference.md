# Reference

<AddonHeader />

## Console commands

| Command | Purpose |
| --- | --- |
| `invoices:pending [--write]` | Paid payments with no invoice, and what is missing. `--write` writes the ones that can be written. |

One, and that is the complete list. Nothing is scheduled and nothing is queued.

::: warning `--write` only catches one kind of failure
It reports a payment whose rate is undetermined and moves on. A missing seller block
(`DetailsMissing`), a product with no `digital` key (`ProductIncomplete`) or an unknown brand
(`BrandUnknown`) will stop the command. Fix those first, then run it again.
:::

## Facade

```php
use Goldnead\Invoices\Facades\Invoices;

Invoices::forPayment($payment);       // Invoice|null
Invoices::creditNoteFor($payment);    // Invoice|null
```

`forPayment()` returns `null` for a payment that is not `paid`, and the **existing** invoice
when there already is one. It throws an `InvoiceNotWritten` subclass when a document cannot
honestly be written.

Behind it is `Goldnead\Invoices\InvoiceWriter`, bound as a singleton.

## Classes you call

| Class | | |
| --- | --- | --- |
| `Support\TaxRules` | `TaxRules::for(productHandle:, buyerCountry:, buyerVatId:, isDigital:, config:)` | a `TaxResult` |
| | `TaxRules::fromConfig($config = null)` | reads the Laravel config when given null |
| | `->resolve(…)` · `->isPlausibleVatId($id)` | |
| | `TaxRules::EU_MEMBER_STATES` | the list, overridable via `tax.eu_member_states` |
| `Support\TaxResult` | `rateBasisPoints`, `reason`, `reverseCharge`, `mechanism`, `legalBasis`, `code`, `productHandle`, `productClass`, `zone`, `buyerCountry`, `placeOfSupplyCountry`, `isDigital`, `pricesIncludeTax`, `notes` | readonly |
| | `isDetermined()` · `isTaxable()` · `isZeroRated()` | |
| | `ratePercent()` · `taxOnNet($net)` · `taxInGross($gross)` · `split($amount)` | |
| | `toArray()` | |
| `Support\NumberSeries` | `take($brandId, $at = null)` | **must run inside a transaction** |
| | `series($brandId, $at)` · `format($series, $number)` | |
| `Support\Renderer` | `view($invoice)` · `html($invoice)` | |

### Mechanisms

`standard` · `exempt` · `reverse_charge` · `intra_community_supply` · `export` ·
`outside_scope` · `small_business` · `undetermined`

## Events

```php
namespace Goldnead\Invoices\Events;
```

| Event | Properties | When |
| --- | --- | --- |
| `InvoiceIssued` | `$invoice` | An invoice exists. Fired after the transaction. |
| `CreditNoteIssued` | `$creditNote`, `$reverses` | An invoice was reversed. |

Two, and that is the complete list.

## Listeners it registers

| Listens for | Does |
| --- | --- |
| `PaymentPaid` | writes the invoice, when `auto_issue` is on |
| `PaymentRefunded` with `isFull` | writes the credit note, when `auto_issue` is on |

Both catch `InvoiceNotWritten` and log it rather than letting it escape. The listener runs
inside somebody else's payment flow, and an exception escaping it would roll back a
fulfilment and have the provider deliver the whole webhook again — for a problem no retry
solves.

## Exceptions

All extend `Goldnead\Invoices\Exceptions\InvoiceNotWritten`, which extends `RuntimeException`.
The common parent exists so a caller can catch all of them at once.

| Exception | Raised when | Carries |
| --- | --- | --- |
| `RateUndetermined` | no rule matched for one or more lines | `$payment`, `$lines` |
| `DetailsMissing` | the seller has no name or address, or a large invoice has no recipient details | `$payment`, `$missing` |
| `ProductIncomplete` | a product does not say whether it is `digital` | `$handle`, `$missing` |
| `BrandUnknown` | a multi-brand installation with no current brand | `$payment` |
| `SeriesWouldCollide` | a brand has no prefix of its own on a multi-brand installation | `$brandId` |

None of them is fixed by trying again. Each is a decision somebody has to make.

## Models

`Models\Invoice` · `Models\InvoiceItem` · `Models\InvoiceCounter`.

`Invoice::KIND_INVOICE` and `Invoice::KIND_CREDIT_NOTE`. `$invoice->items()`,
`$invoice->reverses()`, `$invoice->isCreditNote()`.

`update()` and `delete()` throw on both `Invoice` and `InvoiceItem`. Creating a line outside
`InvoiceItem::whileWriting()` throws too. See
[An invoice does not change](/invoices/immutability).

`$item->ratePercent()` formats basis points for display: `1900` → `19`, German decimal
comma, trailing zeros trimmed.

## Tables

### `invoices`

| Column | |
| --- | --- |
| `brand_id` | `0` for "no brand" — a unique index does not bind on `NULL` |
| `number` | unique across the whole installation |
| `payment_id` | nullable, `nullOnDelete` |
| `kind` | `invoice` · `credit_note`. **`unique(payment_id, kind)`** |
| `reverses_invoice_id` | the invoice a credit note undoes |
| `issued_at` · `currency` | |
| `buyer_name` · `buyer_email` · `buyer_country` · `buyer_vat_id` · `buyer_address` | frozen |
| `seller` | JSON, frozen |
| `net_cent` · `tax_cent` · `gross_cent` | |
| `tax_reason` · `tax_note` | text, frozen |
| `meta` | JSON. Holds `reverses_number` on a credit note |

Indexed on `(brand_id, issued_at)`.

### `invoice_items`

`product` · `name` · `quantity` · `unit_net_cent` · `discount_cent` · `net_cent` ·
`tax_rate_bp` · `tax_cent` · `gross_cent`.

The rate lives here rather than on the invoice because a single order can carry two of them,
and that is exactly the case a single figure cannot express. Basis points, so 19% is `1900`
and 7.5% is not a rounding problem.

### `invoice_counters`

`brand_id` · `series` · `last_number`, unique on `(brand_id, series)`.

`series` is the **resolved** string — `RE2026-08`, not the pattern — so changing the format
later does not change which series an old invoice belonged to.

## Where the data comes from

| On the invoice | Read from |
| --- | --- |
| lines | `payment_items`, or the payment itself when it has none |
| `buyer_name`, `buyer_email` | `payments.name`, `payments.email` |
| `buyer_country` | `payments.country` |
| `buyer_vat_id` | `payment.meta['vat_id']` |
| `buyer_address` | `payment.meta['address']` |
| the tax class | `invoices.tax.product_classes[<product handle>]` |
| `digital` | `statamic-payments.products[<handle>]['digital']` |
| `issued_at` | `payments.paid_at`, or now |

`meta['vat_id']` and `meta['address']` are yours to put there. The payment addon does not
collect them; your checkout does.

## Publish tags

| Tag | |
| --- | --- |
| `invoices-config` | `config/invoices.php` |
| `invoices-views` | `resources/views/vendor/invoices/invoice.blade.php` |

## Control Panel

None. The addon registers no screen, no nav entry and no permission.
