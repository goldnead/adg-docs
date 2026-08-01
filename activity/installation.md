# Installation

<AddonHeader />

<Requirements laravel="12.x or 13.x" queue="Optional. Only recordLater() uses it." />

```bash
composer require goldnead/statamic-activity
php artisan migrate
php artisan vendor:publish --tag=activity-config
```

## What comes with it

Two addons are hard `require` entries, not optional integrations. Composer installs both:

| Package | Constraint | |
| --- | --- | --- |
| [`goldnead/statamic-brand-context`](/brand-context/) | `^1.0` | Resolves the brand stamped on every row |
| [`goldnead/statamic-identity-contracts`](/identity-contracts/) | `^1.0` | Resolves the actor behind every fact |

Both are foundation packages and **behave inertly** in a single-brand, no-CRM application. You will not
notice them, and there is nothing to configure in either one to get started.

Activity also requires PHP `^8.2`, `laravel/framework` `^12.0|^13.0` and `statamic/cms` `^6.0`. Laravel 11
is not supported from **1.1.0** onward.

Nothing here needs a `repositories` entry in your project's `composer.json`. Every package in the suite
resolves from Packagist.

## What the migration creates

One table: `activities`. Every row carries a `brand_id` **from the first migration**, so there is no
single-brand phase to migrate out of later.

See [Recording → Schema](/activity/recording) and the
[reference](/activity/reference#schema) for the columns.

## Verifying the install

```bash
php artisan tinker
```

```php
Goldnead\Activity\Facades\Activity::record('test.installed', [
    'properties' => ['hello' => 'world'],
]);
```

Then **Tools → Activity** in the Control Panel, behind the `view activity` permission.

If the row does not appear, check `activity.enabled` and — in multi-brand mode — that a brand is current;
`tinker` has no session, so with `fail_mode=closed` a query returns nothing even though the write
succeeded.

## Nothing is recorded until something records

Installing the addon does not start collecting. Two things put rows in the table:

1. **A bundled producer**, if the sibling addon is installed:

```php
'producers' => [
    'marketing' => env('ACTIVITY_PRODUCER_MARKETING', true),
    'leadhub' => env('ACTIVITY_PRODUCER_LEADHUB', true),
],
```

2. **Your own calls** to `Activity::record()` or your own
   [producers](/activity/producers).

So an install with neither sibling addon and no calls of your own has an empty ledger, correctly.

## Retention is not configured for you

```php
'retention' => [
    'days' => env('ACTIVITY_RETENTION_DAYS'),
    'anonymize_after_days' => env('ACTIVITY_ANONYMIZE_AFTER_DAYS'),
],
```

Both default to **unset**, and there is **no scheduled prune**. That is deliberate: a ledger's retention
period is a policy decision, so you have to state it.

```bash
php artisan activity:prune --days=365 --dry-run
php artisan activity:prune --days=365
```

Register it in your own scheduler once you have decided:

```php
Schedule::command('activity:prune --days=365')->weekly();
```

::: warning This table grows
Every subscription change, every email open, every CRM status change. On a site sending campaigns to a
large list, `marketing.email_opened` alone will dominate it. Decide a retention period on day one rather
than at 40 million rows.

`retention.per_event_type` exists for exactly that case:

```php
'per_event_type' => ['marketing.email_opened' => 90],
```
:::

## Optional: queue the writes

```php
'queue' => [
    'enabled' => env('ACTIVITY_QUEUE', false),
    'unique_for' => 3600,
],
```

Off by default, and the default is right for most sites: `record()` is one indexed insert, and doing it
inline keeps the request context available.

Turn it on if you record on a hot path. Then use `Activity::recordLater()`, and know that **the actor and
the request context are captured at dispatch time**, never in the worker.

## Identifying the source

```dotenv
ACTIVITY_SOURCE="Main site"
```

Defaults to `APP_NAME`. Worth setting explicitly on a multi-service install, so a fact recorded by the
nightly import is distinguishable from one recorded by the web app.

Pair it with `IDENTITY_SYSTEM_ID` from
[Identity Contracts](/identity-contracts/configuration#system_id).

## Multi-brand

Every row carries `brand_id` from the first migration. In single-brand mode the default brand is stamped
and nothing else changes.

With `brand-context.multi_brand` on, the global scope applies and **fails closed**: no current brand means
no rows, never all rows. Dedupe keys are scoped per brand, so two brands may legitimately record the same
fact independently.

Note that `activity:prune` and `activity:anonymize` run across **all** brands — they are operator actions
on the whole store.

## Licence

MIT.
