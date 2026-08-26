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

## What comes with it

| Package | Constraint | |
| --- | --- | --- |
| [`goldnead/statamic-payments`](/payments/) | `^1.6` | Installed automatically. It owns the catalogue an offer contributes to, and the checkout that charges it. |

That is a hard `require`, not a suggestion. An offer's whole reason for existing is to
resolve as a priced thing in the payment catalogue; without that addon there is nothing for
it to be.

The floor is `^1.6` because an offer needs `Discount` and zero-priced products, both of
which arrived in 1.4, and the 1.6 line is the one that fixed the entitlements bridge and
made the webhook URL configurable.

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
| **Own price** | in minor units. Leave empty for the catalogue price |
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

## No scheduler, no queue

Neither is used. An offer is looked up when something asks for it, and the two counters are
incremented in one statement.

## Licence

Commercial: `composer.json` says `proprietary`. See [Licensing](/guide/licensing).
