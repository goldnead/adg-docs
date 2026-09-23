# Reference

<AddonHeader />

## Console commands

| Command | |
| --- | --- |
| `offers:coupons:generate` | a batch of coupon codes; `--count`, `--prefix`, `--length`, `--percent` or `--amount`, `--currency`, `--offer=*`, `--from`, `--until`, `--max-uses` (0 = no limit), `--name` (placeholders `{n}` and `{code}`). Prints the codes, one per line. |

| `offers:seats-reconcile` | takes back the seats of refunded or charged-back purchases whose access could not be revoked yet. Safe to repeat; **exits non-zero while a seat is still open**. [Schedule it hourly](/offers/seats#schedule-the-catch-up). |

Both run under `php please` too. No queue. The scheduler only for `offers:seats-reconcile`, and
only when you sell seats.

## Routes

| Route | |
| --- | --- |
| `GET /go/{slug}` | the [short link](/offers/links#short-links); prefix `links.prefix`, 302, throttled at 120/min |
| `GET /!/statamic-offers/plaetze/{token}` | the buyer's [seat page](/offers/seats) |
| `POST …/{token}/einladen` · `POST …/{token}/{seat}/zurueckholen` | invite, take back; throttled at 30/min |
| `GET /!/statamic-offers/plaetze/einladung/{token}` · `POST` the same | an invited person's page, and accepting; throttled at 30/min |

The seat routes use `seats.prefix`. All are in the `web` group.

## Antlers tags

| Tag | Parameters | Yields |
| --- | --- | --- |
| `{{ offers:show }}` | `handle` | one offer, or `no_results` |
| `{{ offers:slot }}` | `slot` (default `standalone`), `limit` (default 5) | every sellable active offer in that slot |
| `{{ offers:thanks }}` | `handle`, `amount_cent` | the [thank-you text](/offers/pay-what-you-want#thank-you-tiers) for a chosen amount, or nothing |

Variables: `id`, `handle`, `buy_handle`, `name`, `headline`, `body`, `image`,
`button_label`, `product`, `amount`, `amount_cent`, `compare_at`, `compare_at_cent`,
`discount_percent`, `currency`, `slot`, `remaining_quantity` (null = no limit),
`available_until` (ISO 8601 or null), `checkout_fields` (list of keys), `withdrawal` (the
terms array, see below). See [In a template](/offers/templates).

And for the newer conditions: `pay_what_you_want` (boolean), `pwyw_min_cent`,
`pwyw_suggested_cent`, `pwyw_max_cent` (null on a fixed price), `setup_fee_cent`,
`setup_fee_name`, `first_payment_cent`, `country_mode` (`all`, `only`, `except`),
`countries`, `short_link` (the full URL or null), `seats` (null for an ordinary purchase) and
`coupon_parameter`.

## Classes you call

| Class | Method | |
| --- | --- | --- |
| `Support\Basket` | `Basket::make($offer, $bumpHandles = [], $code = null, $pricingOption = null, $amountCent = null, $country = null)` | builds a basket from what a form posted. Throws `AmountNotAccepted` for a chosen amount out of bounds, `OfferNotAvailable` for a country outside the rule (or none while a rule exists), `InvalidArgumentException` for an amount on a fixed-price offer or an unknown payment option |
| | `handles()` | prefixed handles, the offer first; with the chosen amount (`offer:x:=2500`) and the setup fee line (`offer:x:+setup`) where they apply |
| | `grossCent()` · `netCent()` · `currency()` | |
| | `mainCent()` · `bumpsCent()` · `setupFeeCent()` · `isRecurring()` | |
| | `coupon()` | the `Coupon` as it will apply, or `null` |
| | `discount()` | a `Discount` for the checkout, or `null` — **claims a redemption** |
| | `releaseCoupon()` | gives a claimed redemption back once, when the checkout refused afterwards |
| | `couponTerms()` · `paymentMeta()` | the coupon's terms for the renewals, and `['coupon' => terms]` to attach to the payment; empty when there is nothing to carry |
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
| | `isPayWhatYouWant()` · `acceptsAmount($cent)` · `pwywMinCent()` · `pwywSuggestedCent()` · `pwywMaxCent()` | the [pay-what-you-want](/offers/pay-what-you-want) bounds; the maximum falls back to `pay_what_you_want.max_cent` |
| | `thankYouFor(int $cent)` | the text of the highest tier reached, or `null` |
| | `setupFeeCent()` · `setupFeeName()` · `firstPaymentCent()` | `firstPaymentCent()` is "due today" |
| | `isAvailableIn(?string $country)` · `countryMode()` · `countryList()` | |
| | `shortLinkUrl()` · `linkDestination()` | the full short link or `null`; `target` or `fallback` right now |
| | `seatCount()` | `null` for an ordinary purchase |
| | `recordShown()` · `recordAccepted()` | one `increment()` each |
| | `Offer::prefix()` · `Offer::slots()` (static) | |
| | scopes `active()` · `forSlot($slot)` | |
| `Models\Coupon` | `Coupon::findByCode($code)` (static) | case-insensitive |
| | `isLive()` · `appliesTo($offer)` | |
| | `apply($amountCent, $currency = null)` | the price after the discount |
| | `claim()` · `release()` | conditional `UPDATE`; `claim()` is `false` when it was exhausted in between |
| | `duration()` · `scope()` · `appliesToPayment(int $n)` · `coversFollowUps()` · `terms()` | [duration and scope](/offers/coupons#how-long-a-coupon-applies) |
| | `links()` · `linkFor($key)` · `link()` | the [coupon links](/offers/links#coupon-links) with the code prefilled |
| `Support\CouponBatch` | `generate(array $options)` | up to 100 coupons in one transaction; throws `RuntimeException` after ten collisions on one slot, and then nothing was written |
| `Support\OfferSales` | `sold($offer)` · `revenueCent($offer)` · `revenueByCurrency($offer)` | `sold()` is paid units plus unpaid checkouts younger than `RESERVATION_MINUTES` (60); revenue is net of the line's `discount_cent` and its share of `refunded_cent`; `null` when the payment tables are missing |
| `Offers` (static, `Goldnead\StatamicOffers\Offers`) | `fieldLibrary()` · `fieldKeys()` | the checkout field library from the config, normalised: `key => ['key', 'label', 'type', 'required', 'options', 'rules']` |
| | `couponParameter()` · `couponFromRequest($request, $offer = null)` | the prefill parameter, and the live coupon it names or `null` (logged) |
| | `availableIn($catalogueHandle, $country)` | the country rule, for a sibling that holds only a handle |
| | `thankYouFor($catalogueHandle, $amountCent = null)` | the thank-you text; the amount may come from the handle |
| | `recurringDiscountCent($terms, $number, $amountCent, $currency = null)` | what a coupon takes off payment number `$number` (the first is 1), never below `floor_cent` |
| | `linkPrefix()` · `publicUrl($path)` | the short link path, and an address on `links.base_url` or `app.url` |
| `Support\SeatPools` | `openFor($payment)` · `invite()` · `accept()` · `revoke()` · `close()` · `closeForPayment()` · `resend()` · `reconcile()` | the [seat](/offers/seats) life cycle |
| `Contracts\SeatAccess` | `available()` · `grant()` · `revoke(): bool` | who grants a seat its access; bound to Entitlements by default |

There is no Laravel facade. `Offers` is a plain static class on purpose: siblings call it behind
`method_exists()`, which a facade would answer with `false`. `Offer` and `Coupon` are plain
Eloquent models.

### What the funnel freezes on the payment

`withdrawalTerms()` says what the terms are **today**. At the moment of consent the checkout
writes `waiver_text` plus `version` to the payment's `consent_text` and the whole array to
`meta['withdrawal']`, and `accessWindow()` to `meta['access']`. That is the funnel's job; a text
edited next month must never rewrite what somebody agreed to last month.

## Events

None of its own. The addon **listens** for three:

| Event | From | What it does |
| --- | --- | --- |
| `PaymentPaid` | [Payments](/payments/events) | increments `accepted_count` for every line whose handle carries the offer prefix, payment options and chosen amounts included, the setup fee line excluded; opens a [seat pool](/offers/seats) per seat line and mails the buyer |
| `PaymentRefunded` | Payments | a **full** refund closes the payment's seat pools and takes every seat back |
| `PaymentChargedBack` | Payments 1.23+ | the same as a full refund |

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

A handle may carry a suffix after the offer: a payment option (`offer:x:raten3`), a chosen
amount (`offer:x:=2500`) or the setup fee (`offer:x:+setup`). `Support\OfferHandle` parses all
of them in one place, and the counters, the resolver and the acceptance listener use it. For a
seat offer the entry carries `seat_grants` instead of `grants`.

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

Further Control Panel routes, each behind the permission of its screen:
`utilities/offers/{offer}/qr.{svg|png}` and `utilities/coupons/{coupon}/qr.{svg|png}` for the
[QR codes](/offers/links#qr-codes), and `utilities/offers/seats/{pool}/resend` and
`utilities/offers/seats/{pool}/{seat}/revoke` for [seats](/offers/seats#in-the-control-panel).

**Money fields are in cents**, each with a preview of the amount below it. See
[Configuration](/offers/configuration#money-is-entered-in-cents).

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
| `price_mode` | `fixed` or `pwyw` |
| `pwyw_min_cent` · `pwyw_suggested_cent` | nullable integer, min 0; an empty minimum is saved as `0` |
| `pwyw_max_cent` | nullable integer, min 1; not below the minimum |
| `pwyw_thanks` | up to 12 tiers, each `from_cent` (integer, min 0) and `text` (max 2000) |
| — | pay what you want **never together with several payment options** |
| `setup_fee_cent` · `setup_fee_label` | nullable integer, min 1 · max 191; the fee needs a rhythm on the offer or a payment option |
| `country_mode` | `all`, `only` or `except`; with no countries it is saved as `all` |
| `countries.*` | two letters, up to 250 |
| `link_slug` | nullable, `^[a-z0-9][a-z0-9-]*$`, max 64, unique |
| `link_target` · `link_fallback` | a path starting with `/` or an `http(s)://` address, max 2000; the target is required with a slug |
| `link_switch_at` · `link_switch_on_sold_out` | nullable date-time · boolean |
| `seats` | nullable integer 2–1000; **never on an offer with a rhythm** |

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
| `duration` | `once`, `repeating` or `forever`; default `once` |
| `duration_cycles` | integer 2–120, **required with `repeating`** |
| `applies_to` | `order`, `main` or `bumps`; default `order` |
| `funnel_wide` | boolean |
| `link_url` | nullable, a path starting with `/` or an `http(s)://` address, max 2000 |

## Tables

### `offers`

`handle` (unique) · `name` · `product` · `products` (JSON) · `amount_cent` · `currency` ·
`compare_at_cent` · `discount_percent` · `headline` · `body` · `image` · `button_label` ·
`confirmation_mode` · `confirmation_template` · `withdrawal_days` · `withdrawal_text` ·
`withdrawal_waiver_text` · `withdrawal_checkbox_required` · `withdrawal_b2b_text` ·
`withdrawal_pdf` · `checkout_fields` (JSON) · `access_starts_at` · `access_days` · `slot` ·
`bumps` (JSON) · `active` · `quantity_limit` · `available_from` · `available_until` ·
`shown_count` · `accepted_count` · `brand_id` · `price_mode` · `pwyw_min_cent` ·
`pwyw_suggested_cent` · `pwyw_max_cent` · `pwyw_thanks` (JSON) · `setup_fee_cent` ·
`setup_fee_label` · `country_mode` · `countries` (JSON) · `link_slug` (unique) · `link_target` ·
`link_fallback` · `link_switch_at` · `link_switch_on_sold_out` · `link_hits_target` ·
`link_hits_fallback` · `seats` · `meta` · timestamps.

There is no `sold_count`. Sold is read from paid `payment_items` every time, because a counter
of its own would drift the first time a payment is refunded or a row deleted.

`product` is **not** a foreign key. The catalogue is configuration, not a table, and an
offer pointing at a handle nobody configured has to be a visible mistake rather than a
broken join.

### `offer_coupons`

`code` (unique) · `name` · `percent` · `amount_cent` · `currency` · `offers` (JSON) ·
`starts_at` · `ends_at` · `max_uses` · `used_count` · `active` · `duration` · `duration_cycles` ·
`applies_to` · `funnel_wide` · `link_url` · `meta` · timestamps.

### `offer_seat_pools`

One per paid seat line: `brand_id` · `payment_id` · `offer` · `product` · `owner_email` ·
`owner_name` · `seats` · `grants` (JSON) · `access` (JSON) · `manage_token` (unique) ·
`closed_at` · `closed_reason` · timestamps. Unique on `payment_id` and `offer`, so a redelivered
event opens nothing twice.

### `offer_seats`

`pool_id` (cascade on delete) · `email` · `name` · `token` (unique) · `status` (`invited`,
`claimed`, `revoked`) · `invited_at` · `claimed_at` · `revoked_at` · timestamps.

Both hold the email addresses of the buyer and of everyone she invited. Nothing prunes them.

## Publish tags

| Tag | |
| --- | --- |
| `statamic-offers-config` | `config/statamic-offers.php` |
| `statamic-offers-migrations` | the migrations |

## Multi-site and multi-brand

Offers are not site-scoped. An offer is a commercial decision, not content.

Since 1.11.0 they are brand-scoped: an offer carries a `brand_id`, and the Control Panel and
the public tags narrow to the current brand. The catalogue resolver does not, because a webhook
has no brand. [Short links](/offers/links#short-links) are not narrowed either, and a seat pool
writes access under its own brand.
