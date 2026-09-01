# Reference

<AddonHeader />

## Console commands

| Command | |
| --- | --- |
| `offers:coupons:generate` | a batch of coupon codes; `--count`, `--prefix`, `--length`, `--percent` or `--amount`, `--currency`, `--offer=*`, `--from`, `--until`, `--max-uses` (0 = no limit), `--name` (placeholders `{n}` and `{code}`). Prints the codes, one per line. |

Runs under `php please` too. No queue, no scheduler.

## Antlers tags

| Tag | Parameters | Yields |
| --- | --- | --- |
| `{{ offers:show }}` | `handle` | one offer, or `no_results` |
| `{{ offers:slot }}` | `slot` (default `standalone`), `limit` (default 5) | every sellable active offer in that slot |

Variables: `id`, `handle`, `buy_handle`, `name`, `headline`, `body`, `image`,
`button_label`, `product`, `amount`, `amount_cent`, `compare_at`, `compare_at_cent`,
`discount_percent`, `currency`, `slot`, `remaining_quantity` (null = no limit),
`available_until` (ISO 8601 or null), `checkout_fields` (list of keys), `withdrawal` (the
terms array, see below). See [In a template](/offers/templates).

## Classes you call

| Class | Method | |
| --- | --- | --- |
| `Support\Basket` | `Basket::make($offer, $bumpHandles = [], $code = null)` | builds a basket from what a form posted |
| | `handles()` | prefixed handles, the offer first |
| | `grossCent()` · `netCent()` · `currency()` | |
| | `coupon()` | the `Coupon` as it will apply, or `null` |
| | `discount()` | a `Discount` for the checkout, or `null` — **claims a redemption** |
| | `offer` · `bumps` | readonly properties |
| `Models\Offer` | `amountCent()` · `amount()` · `amountLocal()` | its own price, or the catalogue's — `amountCent()` delegates to `effectiveAmountCent()` |
| | `effectiveAmountCent()` | own price, else catalogue price minus `discount_percent`, rounded to the cent |
| | `effectiveCompareAtCent()` | hand-set `compare_at_cent`, else the catalogue price when a percentage applies, else `null` |
| | `compareAt()` · `compareAtLocal()` | the effective compare-at price |
| | `currency()` · `isSellable()` | `isSellable()` also checks the time window and the remaining quantity |
| | `isWithinWindow()` · `remainingQuantity()` | `null` remaining = no limit; `0` = sold out. A soft limit: checked at checkout start, counted when paid; open checkouts hold a unit for an hour, but two simultaneous starts on the last unit can both pay — keep a reserve where that matters |
| | `accessWindow()` | `['starts_at' => 'Y-m-d'\|null, 'days' => int\|null]` or `null` |
| | `checkoutFields()` | the offer's picks, only keys the library still knows |
| | `withdrawalTerms()` | `['days', 'text', 'waiver_text', 'checkbox_required', 'b2b_text', 'version']`; `version` is 12 characters of `sha1(days\|text\|waiver_text)` |
| | `bumpOffers()` | the sellable bumps, in the order they were picked |
| | `recordShown()` · `recordAccepted()` | one `increment()` each |
| | `Offer::prefix()` · `Offer::slots()` (static) | |
| | scopes `active()` · `forSlot($slot)` | |
| `Models\Coupon` | `Coupon::findByCode($code)` (static) | case-insensitive |
| | `isLive()` · `appliesTo($offer)` | |
| | `apply($amountCent, $currency = null)` | the price after the discount |
| | `claim()` | conditional `UPDATE`; `false` when it was exhausted in between |

| `Support\CouponBatch` | `generate(array $options)` | up to 100 coupons in one transaction; throws `RuntimeException` after ten collisions on one slot, and then nothing was written |
| `Support\OfferSales` | `sold($offer)` · `revenueCent($offer)` · `revenueByCurrency($offer)` | `sold()` is paid units plus unpaid checkouts younger than `RESERVATION_MINUTES` (60); revenue is net of the line's `discount_cent` and its share of `refunded_cent`; `null` when the payment tables are missing |
| `Offers` (static, `Goldnead\StatamicOffers\Offers`) | `fieldLibrary()` · `fieldKeys()` | the checkout field library from the config, normalised: `key => ['key', 'label', 'type', 'required', 'options', 'rules']` |

There is no Laravel facade. `Offers` is a plain static class on purpose: siblings call it behind
`method_exists()`, which a facade would answer with `false`. `Offer` and `Coupon` are plain
Eloquent models.

### What the funnel freezes on the payment

`withdrawalTerms()` says what the terms are **today**. At the moment of consent the checkout
writes `waiver_text` plus `version` to the payment's `consent_text` and the whole array to
`meta['withdrawal']`, and `accessWindow()` to `meta['access']`. That is the funnel's job; a text
edited next month must never rewrite what somebody agreed to last month.

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
query scope, so the pager counts the rows the filter left. One on the Offers screen: **Slot**,
which is how the listing becomes an upsell overview — filter to *after the purchase* and read
shown, accepted, conversion and **revenue** side by side. The revenue column only exists when
the payment tables do; the **Available** column names one of four states (unlimited, *n* of
*m* left, sold out, not yet / ended).

A second primary action on the Coupons screen, **Generate codes**, posts to
`utilities/coupons/generate` behind the same permission.

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
| `discount_percent` | nullable integer 1–99, **never together with `amount_cent`** |
| `quantity_limit` | nullable integer, min 1 |
| `available_from` · `available_until` | nullable date-times in the app timezone; `until` after `from` when there is one |
| `access_starts_at` · `access_days` | nullable date · nullable integer 1–65535 |
| `checkout_fields.*` | a key in `config('statamic-offers.checkout_fields')`; stored in library order, empty as `null` |
| `withdrawal_days` | nullable integer 1–365 |
| `withdrawal_text` · `withdrawal_b2b_text` | nullable, max 20000 |
| `withdrawal_waiver_text` | nullable, max 2000 |
| `withdrawal_checkbox_required` | boolean; **omitted means `true`** |
| `withdrawal_pdf` | boolean; a stored flag, nothing renders it yet |

Nullable *integers* on the prices, so nobody can post `"12,00"` and have it read as 12 cents.

### A coupon batch (`POST utilities/coupons/generate`)

| Field | Rule |
| --- | --- |
| `count` | required integer 1–100 |
| `prefix` | nullable, max 12, no whitespace; stored upper-case |
| `length` | nullable integer 6–12, default 8 |
| `name` | nullable, max 191; `{n}` and `{code}` are replaced |
| `percent` · `amount_cent` · `currency` · `offers.*` · `starts_at` · `ends_at` | as for a coupon |
| `max_uses` | nullable integer, min 1; the form sends 1 |

Ten collisions on one slot abort the batch with a validation error on `count`, and nothing was
written.

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

`handle` (unique) · `name` · `product` · `products` (JSON) · `amount_cent` · `currency` ·
`compare_at_cent` · `discount_percent` · `headline` · `body` · `image` · `button_label` ·
`confirmation_mode` · `confirmation_template` · `withdrawal_days` · `withdrawal_text` ·
`withdrawal_waiver_text` · `withdrawal_checkbox_required` · `withdrawal_b2b_text` ·
`withdrawal_pdf` · `checkout_fields` (JSON) · `access_starts_at` · `access_days` · `slot` ·
`bumps` (JSON) · `active` · `quantity_limit` · `available_from` · `available_until` ·
`shown_count` · `accepted_count` · `meta` · timestamps.

There is no `sold_count`. Sold is read from paid `payment_items` every time, because a counter
of its own would drift the first time a payment is refunded or a row deleted.

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
