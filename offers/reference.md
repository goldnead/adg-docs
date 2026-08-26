# Reference

<AddonHeader />

## Console commands

None. The addon registers no commands, uses no queue and needs no scheduler.

## Antlers tags

| Tag | Parameters | Yields |
| --- | --- | --- |
| `{{ offers:show }}` | `handle` | one offer, or `no_results` |
| `{{ offers:slot }}` | `slot` (default `standalone`), `limit` (default 5) | every sellable active offer in that slot |

Variables: `id`, `handle`, `buy_handle`, `name`, `headline`, `body`, `image`,
`button_label`, `product`, `amount`, `amount_cent`, `compare_at`, `currency`, `slot`. See
[In a template](/offers/templates).

## Classes you call

| Class | Method | |
| --- | --- | --- |
| `Support\Basket` | `Basket::make($offer, $bumpHandles = [], $code = null)` | builds a basket from what a form posted |
| | `handles()` | prefixed handles, the offer first |
| | `grossCent()` · `netCent()` · `currency()` | |
| | `coupon()` | the `Coupon` as it will apply, or `null` |
| | `discount()` | a `Discount` for the checkout, or `null` — **claims a redemption** |
| | `offer` · `bumps` | readonly properties |
| `Models\Offer` | `amountCent()` · `amount()` · `amountLocal()` | its own price, or the catalogue's |
| | `compareAt()` · `compareAtLocal()` | |
| | `currency()` · `isSellable()` | |
| | `bumpOffers()` | the sellable bumps, in the order they were picked |
| | `recordShown()` · `recordAccepted()` | one `increment()` each |
| | `Offer::prefix()` · `Offer::slots()` (static) | |
| | scopes `active()` · `forSlot($slot)` | |
| `Models\Coupon` | `Coupon::findByCode($code)` (static) | case-insensitive |
| | `isLive()` · `appliesTo($offer)` | |
| | `apply($amountCent, $currency = null)` | the price after the discount |
| | `claim()` | conditional `UPDATE`; `false` when it was exhausted in between |

There is no facade. `Offer` and `Coupon` are plain Eloquent models.

## Events

None of its own. The addon **listens** for one:

| Event | From | What it does |
| --- | --- | --- |
| `PaymentPaid` | [Payments](/payments/events) | increments `accepted_count` for every line whose handle carries the offer prefix |

If you want to know that an offer was accepted, listen to `PaymentPaid` and read the lines.
The offer handle is on `payment_items.product`, with the prefix.

## The catalogue resolver

Registered in `register()`:

```php
Catalogue::extend(fn (string $handle) => /* … */);
```

It answers only for handles starting with the configured prefix, refuses to re-enter itself,
and returns `name`, `amount_cent`, `currency` and `offer` (the bare handle) — the last of
which is what a payment line remembers it was sold as.

The configured catalogue always wins. See
[Products and the catalogue](/payments/catalogue#another-addon-can-contribute-products).

## Control Panel

| Screen | Permission | |
| --- | --- | --- |
| **Utilities → Offers** | `access offers utility` | list, create, edit, delete |
| **Utilities → Coupons** | `access coupons utility` | list, create, edit, delete, activate, deactivate |

Two permissions, deliberately separate: "may edit the words on an upsell" is not the same
authority as "may hand out discounts".

Two actions are registered, both on coupons and both offered in bulk:
`statamic_offers_activate_coupon` and `statamic_offers_deactivate_coupon`.

Two filters on the Coupons screen: **Active**, and **Valid right now** — the second as a
query scope, so the pager counts the rows the filter left.

## Validation

### An offer

| Field | Rule |
| --- | --- |
| `name` | required, max 191 |
| `handle` | required, `^[a-z0-9][a-z0-9_-]*$`, unique |
| `product` | required, **must be a handle in `statamic-payments.products`** |
| `amount_cent` · `compare_at_cent` | nullable integer, min 1 |
| `currency` | nullable, exactly 3 characters |
| `headline` · `button_label` | nullable, max 191 |
| `body` | nullable, max 5000 |
| `image` | nullable, max 500 |
| `slot` | required, one of the three |
| `bumps.*` | an existing offer placed at checkout, never this offer |

Nullable *integers* on the prices, so nobody can post `"12,00"` and have it read as 12 cents.

### A coupon

| Field | Rule |
| --- | --- |
| `code` | required, max 64, no whitespace, unique |
| `percent` | nullable integer 1–100 |
| `amount_cent` | nullable integer, min 1 |
| — | **exactly one of the two** |
| `currency` | nullable, exactly 3 |
| `offers.*` | must be an existing offer handle |
| `starts_at` · `ends_at` | nullable dates; `ends_at` after `starts_at` **when there is one** |
| `max_uses` | nullable integer, min 1 |

## Tables

### `offers`

`handle` (unique) · `name` · `product` · `amount_cent` · `currency` · `compare_at_cent` ·
`headline` · `body` · `image` · `button_label` · `slot` · `bumps` (JSON) · `active` ·
`shown_count` · `accepted_count` · `meta` · timestamps.

`product` is **not** a foreign key. The catalogue is configuration, not a table, and an
offer pointing at a handle nobody configured has to be a visible mistake rather than a
broken join.

### `offer_coupons`

`code` (unique) · `name` · `percent` · `amount_cent` · `currency` · `offers` (JSON) ·
`starts_at` · `ends_at` · `max_uses` · `used_count` · `active` · `meta` · timestamps.

## Publish tags

| Tag | |
| --- | --- |
| `statamic-offers-config` | `config/statamic-offers.php` |
| `statamic-offers-migrations` | the migrations |

## Multi-site and multi-brand

Offers are not site-scoped and not brand-scoped. An offer is a commercial decision, not
content.
