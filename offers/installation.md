# Installation

<AddonHeader />

<Requirements />

```bash
composer require goldnead/statamic-offers
php artisan migrate
php artisan vendor:publish --tag=statamic-offers-config
```

No front-end build step: the compiled Control Panel assets ship under `dist/` and Statamic
publishes them on install.

Two entries appear under **Utilities**: **Offers** and **Coupons**.

<Figure
  src="offers-editor"
  alt="The offer form: product picker, price, currency, placement, the words that sell it, and the bumps field"
  caption="One offer, edited whole. The product it points at is chosen, never typed." />

## What comes with it

| Package | Constraint | |
| --- | --- | --- |
| [`goldnead/statamic-payments`](/payments/) | `^1.15` | Installed automatically. It owns the catalogue an offer contributes to, and the checkout that charges it. |
| [`goldnead/statamic-brand-context`](/brand-context/) | `^1.13` | Installed automatically. Offers carry a brand, and the screens narrow to it. |
| `bacon/bacon-qr-code` | `^3.0` | The QR encoder for [links](/offers/links#qr-codes). Statamic already ships it. |
| [`goldnead/statamic-entitlements`](/entitlements/) | `^1.4`, suggested | Only for [seats](/offers/seats): it grants and revokes the access of an accepted seat. |

Payments is a hard `require`, not a suggestion. An offer's whole reason for existing is to
resolve as a priced thing in the payment catalogue; without that addon there is nothing for
it to be.

The floor is `^1.15` because that is the version whose `Brands` carries `readerId()`, which
the brand-scoped screens call. A constraint that allowed an older Payments would let
somebody install the pair and get a fatal error on the Offers screen.

Some of the newer conditions need more of Payments than the floor:

| Feature | Needs |
| --- | --- |
| Closing seat pools on a chargeback | Payments 1.23 |
| A coupon on more than the first payment of a subscription | a Payments version that reads `meta.coupon` (newer than 1.24.5) |
| The country rule enforced in `Checkout::start()` as well as in the basket | Payments newer than 1.24.5 |

::: tip Invoices needs more than that
If you also issue [invoices](/invoices/), the payment addon has to be `^1.9` — the version
that records the buyer's country and the discount per line. Neither can be reconstructed
afterwards. See [Troubleshooting](/offers/troubleshooting#an-offer-line-gets-no-invoice).
:::

## Quick start

### 1. Make an offer

**Utilities → Offers → Add.**

| Field | |
| --- | --- |
| **Name** | for you, in the Control Panel, and the fallback headline |
| **Handle** | lowercase, digits, `-` and `_`; unique |
| **Product** | a select over the handles in `statamic-payments.products` |
| **Own price** | in cents, so `2900` is 29.00; the amount it stands for is shown below. Leave empty for the catalogue price |
| **Compare-at price** | shown only, never charged |
| **Headline · Text · Image · Button label** | the words. The image is a URL |
| **Where** | At checkout · After the purchase · Anywhere |
| **Bumps** | only offers placed *At checkout* can be picked |
| **Active** | |

### 2. Show it

```antlers
{{ offers:show handle="fruehling-upsell" }}
    {{ if no_results }}
        {{# Nothing to offer: inactive, or its product is gone. #}}
    {{ else }}
        <h2>{{ headline }}</h2>
        <p>{{ amount }} {{ currency }}</p>
        <input type="hidden" name="product" value="{{ buy_handle }}">
    {{ /if }}
{{ /offers:show }}
```

### 3. Buy it

```php
app(Checkout::class)->start('offer:fruehling-upsell', $buyer);
```

`buy_handle` already carries the prefix, so a template never has to remember it.

## Permissions

| Permission | Grants |
| --- | --- |
| `access offers utility` | The Offers screen, and writing offers |
| `access coupons utility` | The Coupons screen, and writing coupons |

Separate on purpose: "may edit the words on an upsell" is not the same authority as "may
hand out discounts".

## The scheduler, only for seats

No queue is used. An offer is looked up when something asks for it, and the counters are
incremented in one statement.

If you sell [seats for groups](/offers/seats), register the catch-up for access that could not
be revoked when a purchase was refunded:

```php
// routes/console.php
Schedule::command('offers:seats-reconcile')->hourly();
```

Without seats there is nothing for it to do.

## Updating

Every release that adds a column ships an additive migration: existing rows keep their
behaviour. Run it **before the next sale**, not afterwards:

```bash
composer update goldnead/statamic-offers
php artisan migrate
```

The release after 1.11.3 adds six: price modes and the setup fee, the country rule, the short
link, coupon duration and scope, the seat tables, and the closing date of a seat pool. Existing
offers stay fixed-price and worldwide, and existing coupons stay "the first payment, whole
basket".

## Licence

Commercial: `composer.json` says `proprietary`. See [Licensing](/guide/licensing).
