# Installation

<AddonHeader />

<Requirements laravel="12.40+ / 13.x" />

```bash
composer require goldnead/statamic-affiliates
php artisan migrate
php artisan affiliates:install
```

`composer require` pulls in [Brand Context](/brand-context/) 1.14 or later, which the addon
needs for brand scoping, its settings tab and the sender identity of its mails. The migration
creates seven tables, all prefixed `affiliate_` (see [Reference](/affiliates/reference#tables)).
`affiliates:install` creates the `affiliate_materials` collection with a blueprint for
promotional material; an existing collection or blueprint is kept as it is. The blueprint's
image field gets an asset container: `materials.container` (env
`AFFILIATES_MATERIALS_CONTAINER`), or the site's first one. Run the command again after
creating the site's first container, or on an install from before that setting: an existing
blueprint whose image field has no container is repaired, and nothing else in it changes.

## What else it wants

| Package | Needed for | Without it |
| --- | --- | --- |
| [Payments](/payments/) 1.24+ | anything to be attributed: `PaymentPaid` books, `PaymentRefunded` and `PaymentChargedBack` reverse | nothing is ever booked |
| [Offers](/offers/) | partner coupons: a redeemed code counts as a referral without a cookie | links only |
| [Consent](/consent/) | asking the visitor before the referral cookie is written | with the default `consent.mode: auto`, no cookie is written; the referral lasts for the visit |

| [Webhook Manager](/webhook-manager/) | the four partner moments as triggers for outbound webhooks, from Affiliates 0.2 | no triggers; nothing else changes |

All four are `suggest`, detected at runtime.

## Consent

If you use Consent, add a service with the handle `affiliates` to
`config/statamic-consent.php`. Otherwise the banner never offers it and the answer is always
no. See [Attribution → Consent](/affiliates/attribution#consent).

## The partner area

Put it on a page of your site:

```antlers
{{ affiliates:dashboard }}
```

Signing up needs a signed-in user. See [The partner area](/affiliates/partner-area).

## The scheduler

Nothing is scheduled for you. One command wants a schedule:

```php
// routes/console.php
Schedule::command('affiliates:release')->hourly()->withoutOverlapping();
```

`affiliates:release` makes commissions whose hold period is over payable. Opening the
Commissions or Payouts screen, and building a payout list, does the same, so payouts are never
short without it. What stays behind is the partner area: its "on hold" and "payable" figures
are read by status, and a commission only changes status when one of the two runs.

## Static caching

With Statamic's full static caching (`strategy: full`) a cached page is served by the web
server without PHP, so `?ref=` on it is never seen. Hand out
`/!/affiliates/go/{code}?to=/page` links instead, or bypass the static cache for URLs carrying
`ref=`. The half-measure strategy needs nothing. See
[Attribution → Static caching](/affiliates/attribution#static-caching).

## Permissions

Under the group **Affiliates** in a role's permissions:

| Permission | Allows |
| --- | --- |
| `view affiliates` | the Partners and Commissions screens, a partner's detail |
| `manage affiliates` | creating and editing partners, rates and JV contracts; nested under `view affiliates` |
| `manage affiliate payouts` | the Payouts screen, the CSV, marking lists paid, cancelling a commission, and seeing and editing payout details unmasked; nested under `view affiliates` |
| `manage affiliates settings` | the Affiliates tab on the settings screen |

The partner area and the tracking link are public front-end routes.

## Publishable tags

| Tag | What it publishes |
| --- | --- |
| `affiliates-config` | `config/affiliates.php` |
| `affiliates-migrations` | The migration, into `database/migrations/` |
| `affiliates-views` | The partner area and the two mails, into `resources/views/vendor/affiliates/` |
| `affiliates-translations` | The language files (English and German), into `lang/vendor/affiliates/` |

The migration runs from the package without being published. The Control Panel bundle ships
compiled under `dist/build/`, and Statamic publishes it on install.

## Licence

Commercial: `composer.json` says `proprietary`. How it is sold is on
[Licensing](/guide/licensing).
