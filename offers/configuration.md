# Configuration

<AddonHeader />

```bash
php artisan vendor:publish --tag=statamic-offers-config
```

Ten keys. Everything else about an offer is a row in a table, edited in the Control Panel,
because that is the point of the addon.

| Key | Default | What happens when it is wrong |
| --- | --- | --- |
| `handle_prefix` | `offer:` | Change it and every template referring to an offer changes too. Empty would let an offer reprice a product of the same name. |
| `count_impressions` | `true` | Off means the shown count stays at zero and the ratio becomes meaningless. Useful on a heavily cached page, where it was meaningless anyway. |
| `seller.name` · `seller.contact` | `null` | Fill `{seller_name}` and `{seller_contact}` in the withdrawal text. Empty falls back to `app.name` and `mail.from.address`. |
| `withdrawal` | 14 days, German draft wording | The site-wide terms every offer inherits field by field. |
| `checkout_fields` | eight fields | The library the offer form picks from. |
| `pay_what_you_want.max_cent` | `500000` | The ceiling for a [chosen amount](/offers/pay-what-you-want) when the offer names none. A check against a typo, not a price recommendation. |
| `coupon_link.parameter` | `coupon` | The URL parameter that [prefills a code](/offers/links#coupon-links). Renaming it breaks every printed link with the old name: the page opens, without the discount. |
| `links.prefix` · `links.base_url` | `go` · `null` | The [short link](/offers/links#short-links) path, and the address printed in links and QR codes (`null` means `app.url`). The prefix must not equal a page path of the site. |
| `seats.prefix` · `seats.after_claim_url` | `!/statamic-offers/plaetze` · `null` | Where the [seat pages](/offers/seats) live, and where the button after accepting a seat leads. `null` means no button. |
| `webhook_manager.enabled` | `true` (`STATAMIC_OFFERS_WEBHOOK_MANAGER`) | Off, the events are no longer offered as [webhook triggers](/offers/webhooks). The events themselves still fire. 1.13. |

## Withdrawal defaults

```php
'withdrawal' => [
    'days' => 14,
    'text' => '…',            // placeholders {days}, {seller_name}, {seller_contact}
    'waiver_text' => '…',     // § 356 Abs. 5 BGB
    'checkbox_required' => true,
    'b2b_text' => null,
],
```

An offer inherits every key it leaves empty and overrides the ones it sets, so one offer may
have a longer period and still carry the site's wording — with its own period written into it.
`Offer::withdrawalTerms()` is the merged result, and its `version` changes exactly when the
period, the text or the waiver changes.

**The shipped wording is a draft, to be checked by a lawyer.** It follows §§ 355, 356 Abs. 5 and
356a BGB, but no config file is legal advice.

## The checkout field library

```php
'checkout_fields' => [
    'name' => ['label' => 'statamic-offers::messages.checkout_field_name', 'type' => 'text', 'required' => true],
    'country' => ['label' => '…', 'type' => 'text', 'required' => true, 'rules' => ['size:2']],
    // …
    'newsletter' => ['label' => 'Newsletter', 'type' => 'checkbox'],
    'size' => ['label' => 'Size', 'type' => 'select', 'options' => ['s' => 'S', 'm' => 'M']],
],
```

Every field a checkout *could* ask for, defined once; the offer picks from it. `type` is `text`,
`select` or `checkbox` — anything else is read as `text`. A label may be a translation key.
`country` is free text with `size:2` rather than a select because that is what the funnel's
checkout validates and what the invoice needs.

Removing a key from the library silently drops it from every offer that had picked it:
`Offer::checkoutFields()` returns only keys that still exist.

## The handle prefix

```php
'handle_prefix' => 'offer:',
```

How an offer is referred to where a *product* handle is expected. With the default,
`offer:fruehling-upsell` buys the offer `fruehling-upsell`.

The prefix is what keeps offers and products apart. A product is what a thing costs; an
offer is what it costs *here*. Without a prefix, an offer named after a product could
quietly reprice it, and the checkout would charge the wrong amount with no sign that
anything was wrong.

**An empty prefix is not honoured.** It falls back to `offer:` rather than being taken at
face value, because "no prefix" is never what somebody meant.

Changing it is a breaking change for your own templates and for any code that builds a
handle by hand. `{{ offers:show }}` yields `buy_handle` with the current prefix already
applied, which is the way to avoid caring.

## Counting impressions

```php
'count_impressions' => true,
```

Whether `{{ offers:show }}` and `{{ offers:slot }}` increment `shown_count`.

Off means the **accepted** count still rises but the shown count stays at zero, so the ratio
becomes meaningless. That is the trade, and the reason the switch exists is a heavily cached
page, where the count was meaningless anyway: a page served from cache renders the tag once
and is seen a thousand times.

The counter is an `increment()` — one statement in the database, so two people seeing the
same offer in the same second cannot lose one of them the way read-add-write does.

## Links and seats

```php
'pay_what_you_want' => ['max_cent' => 500000],

'coupon_link' => ['parameter' => 'coupon'],

'links' => [
    'prefix' => 'go',        // /go/<slug>
    'base_url' => null,      // null = app.url
],

'seats' => [
    'prefix' => '!/statamic-offers/plaetze',
    'after_claim_url' => null,
],
```

`base_url` is for an install whose Control Panel runs under a different address than the site
that should be printed on the flyer. The QR code encodes whatever address this produces, so set
it before printing.

## Money is entered in cents

Every money field in the offer and coupon forms takes **cents**: `2500` is 25.00. Each one says
so next to the field and shows the amount it stands for below it ("Equals 25,00 €"), so a
missing or extra zero is visible before saving. The whole suite enters money this way. That is
not a setting.

## What is not configurable

**The slots.** `bump`, `post_purchase` and `standalone` are a fixed list, because a slot is
a promise about context — a post-purchase offer shown at checkout would charge twice for the
same journey — and a free-text slot is a promise nobody checks.

**Which products may be picked.** The offer form validates `product` against the handles in
`statamic-payments.products`, so an offer can only point at something the site actually
sells. Offers cannot point at other offers: that pair asked each other what they cost until
memory ran out, and the listing you would have deleted one from died with it.

**What a coupon is worth.** That is a row in `offer_coupons`, not a setting. See
[Coupons](/offers/coupons).
