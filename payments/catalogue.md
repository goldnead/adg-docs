# Products and the catalogue

<AddonHeader />

The catalogue is the answer to one question: **what may be bought, and for how much.** It
is read on the server, and it is the only place a price comes from.

```php
// config/statamic-payments.php
'products' => [
    'noten-paket' => [
        'name' => 'Notenpaket „Frühling"',
        'amount_cent' => 1900,
    ],
],
```

Empty as shipped. An addon that carried prices would be wrong about every site that
installed it.

## What a product may declare

| Key | Type | Meaning |
| --- | --- | --- |
| `amount_cent` | `int` | **Required.** Minor units. Zero is allowed; `null`, a negative number and `'19,00'` are not. |
| `name` | `string` | What the buyer reads on their bank statement, and what the payment line remembers. Defaults to the handle. |
| `currency` | `string` | Defaults to `statamic-payments.currency`. |
| `min_quantity` · `max_quantity` | `int` | Bounds for a variable quantity. **1.11.0.** |
| `interval` | `string` | Makes it recurring: `"1 month"`, `"12 weeks"`. See [Subscriptions](/payments/subscriptions). |
| `times` | `int` | With `interval`: a payment plan of that many cycles. Absent means "until cancelled". |
| `trial_days` · `trial_amount_cent` | `int` | A trial, and what it charges today. |
| `grants` | `string` | The entitlement a paid product hands out, with the [Entitlements](/entitlements/) bridge on. |
| `digital` | `bool` | Whether this is a digital service or a physical good. Read by [Invoices](/invoices/), never by this addon. |

Anything else you put on a product survives untouched — `Catalogue::find()` returns the
array it found plus `handle`, `currency` and `name` filled in — which is how keys that mean
nothing here reach the code that does care about them.

## Integers, and only integers

`amount_cent` is an integer in the smallest unit of the currency. Not a float: a float is
how a cent goes missing every thousand orders.

A **missing or mistyped** price is refused. `null`, `-500` and the string `'19,00'` all make
`Catalogue::find()` return nothing, and a checkout for that handle returns `null` rather
than charging something plausible.

## Zero is a statement

```php
'sample-chapter' => ['name' => 'Leseprobe', 'amount_cent' => 0],
```

A product may cost nothing. The provider is never called, the payment is marked paid and
fulfilled on the spot, and the **same `PaymentPaid` event** fires through the same one-time
claim — so a listener that grants access cannot tell the difference, and a free product is
not an account with nothing in it.

The row is marked `provider = free` and `provider_id = free-<id>`, so a report can separate
free orders from real ones without guessing from the amount.

::: warning `0` and a typo must not look alike
`0` is somebody saying "this one is free". `null`, a negative number and `'0,00'` are
mistakes, and a mistake must never become a giveaway. That is why the first is accepted and
the others are refused.
:::

## Handles

A handle is what a browser sends and what a report groups by. Two properties are worth
knowing:

**Dots are not paths.** The catalogue reads `$products[$handle]` directly rather than
through `Arr::get()`, because a handle containing a dot would otherwise walk into a nested
config array instead of simply missing.

**A handle nobody configured refuses the checkout**, and in a multi-line checkout it
refuses the *whole* checkout rather than dropping the line. See
[Starting a checkout](/payments/checkout#all-or-none).

## Quantity bounds

The quantity is the single figure a checkout takes from a request. The unit price never is,
which is what makes a bounded integer safe.

```php
'spende' => [
    'name' => 'Spende',
    'amount_cent' => 100,      // one euro per unit
    'min_quantity' => 5,
    'max_quantity' => 50000,
],
```

That is a donation between €5 and €500, with the unit price still server-side. A product
that declares nothing keeps the behaviour it always had — a quantity is allowed, capped by
the global `max_quantity` (default 1000), which exists only so a mistyped or hostile figure
cannot become a five-figure charge.

## Another addon can contribute products

```php
use Goldnead\StatamicPayments\Support\Catalogue;

Catalogue::extend(function (string $handle): ?array {
    return $handle === 'offer:fruehling'
        ? ['name' => 'Frühlingsangebot', 'amount_cent' => 1200]
        : null;
});
```

A resolver is asked only when the configured catalogue has nothing under that handle.
**The configured catalogue always wins.** A resolver may add handles, never reprice one the
site has already decided about: config is the site owner's word, an addon is a helper.

Register it from a service provider's `register()`, not `bootAddon()` — a resolver that is
never registered makes an offer look like a missing product rather than a missing
registration.

And the amount still never comes from a request. A resolver runs on the server, which is
the whole reason this is a seam rather than a parameter.

[Offers](/offers/price-rule) is built on it: `offer:fruehling-upsell` resolves like any
other product, and every guard in this addon applies to it unchanged.

## What the catalogue is not

It is not a product collection, not a fieldtype, and not something an editor manages in the
Control Panel. It is configuration, and that is deliberate: a price that can be edited by
whoever can log in is a price that can be edited by whoever can log in.

If you want editable pricing with words, images and a place to appear, that is what
[Offers](/offers/) is — a table, still on the server, that feeds this catalogue through the
seam above.
