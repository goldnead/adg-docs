# Installation

<AddonHeader />

<Requirements php="8.2+" statamic="6.0+" laravel="12.40+ / 13.x" database="MySQL or SQLite" queue="Optional" />

## Requiring it

```bash
composer require goldnead/statamic-lead-magnets
php artisan migrate
```

The package is tagged and on Packagist, so nothing else is needed: no `repositories` block and
no `@dev` constraint.

::: warning The Control Panel bundle is not in the repository
Unlike most addons in the suite, this one does **not** commit its built assets. They are
attached to each GitHub release as `dist.tar.gz` and fetched at install time by
`pixelfear/composer-dist-plugin`, which reads `extra.download-dist`.

Two installs therefore end up with **no Control Panel assets and no error**: one from a path
repository pointing at a checkout, and one from a tag whose release workflow did not succeed,
because neither has a `dist.tar.gz` to fetch. Build them yourself:

```bash
cd ../statamic-lead-magnets && npm install && npm run build
```
:::

## What comes with it

| Package | Constraint | Why |
| --- | --- | --- |
| `goldnead/statamic-brand-context` | `^1.5\|^1.6\|^1.7` | Every resource, grant and download row carries a `brand_id`, and two public routes derive the brand from the value the visitor already holds |
| `pixelfear/composer-dist-plugin` | `^0.1` | Fetches the Control Panel bundle from the GitHub release |

`statamic/cms ^6.0` and `laravel/framework ^12.40|^13.0` are in `require` as well.

The brand-context constraint is narrower than the rest of the suite's `^1.0`, because this package
uses `brandForUnique()` and `setCurrent()`, which are newer.

## The five suggestions

```
goldnead/statamic-leadhub          contact and tags when a grant activates
goldnead/statamic-marketing        mailing-list subscription
goldnead/statamic-email-templates  editor-authored mail bodies
goldnead/statamic-suppression      the send gate
goldnead/statamic-activity         the ledger
```

None is required and none is a Composer dependency. Install none of them and the full flow works
on this package's own mail, state and routes. See [Bridges](/lead-magnets/bridges).

::: warning Install Suppression before you send at volume
Without it, `SuppressionBridge::blocks()` returns `false` for every address and this package will
mail one that has been hard-bouncing for a month. It fails **open** when the addon is absent,
because there is nothing to ask; it fails **closed** when the addon is present and throws.
:::

## Migrations

Three, loaded automatically. `php artisan migrate` after install is enough.

```
2026_08_02_000001_create_lead_magnet_resources_table
2026_08_02_000002_create_lead_magnet_grants_table
2026_08_02_000003_create_lead_magnet_downloads_table
```

**There are no foreign keys anywhere in the package.** `grants.contact_id` points at LeadHub,
which may not be installed, and a foreign key to a table that may not exist is not a constraint,
it is an install failure. The other relationships are enforced in application code.

## The scheduler

```php
$schedule->command('lead-magnets:sweep')->hourly()->onOneServer()->name('lead-magnets-sweep');
```

Registered for you. It needs a running scheduler:

```bash
php artisan schedule:work        # locally
* * * * * cd /path && php artisan schedule:run >> /dev/null 2>&1
```

**Without it nothing breaks.** Since 3.0 the sweep only clears confirmation tokens whose window
has closed. Access expiry is derived from the clock by entitlements, so there is nothing left to
mark. What you lose is a database holding token hashes that can no longer be redeemed.

## Verifying it works

```bash
php artisan route:list --name=lead-magnets
```

Three public routes and ten Control Panel routes:

```
POST  !/lead-magnets/request           lead-magnets.request
GET   !/lead-magnets/confirm/{token}   lead-magnets.confirm
GET   !/lead-magnets/download/{grant}  lead-magnets.download
```

Then create a resource in the Control Panel under **Tools → Lead Magnets** and post a request at
it. `php artisan lead-magnets:sweep` should report zero cleared confirmation tokens.

## Publishing

```bash
php artisan vendor:publish --tag=lead-magnets-config
php artisan vendor:publish --tag=lead-magnets-views
php artisan vendor:publish --tag=lead-magnets-translations
```

The third is not in the README and exists.

The views are the public confirmation page, its layout and the four mail templates, two per mail.
Overriding them is the way to change the wording without installing
[Email Templates](/email-templates/), and it is why that sibling is a convenience rather than a
dependency.

The public layout is deliberately plain, carries `noindex, nofollow`, inlines its CSS and does
not extend the site layout. It is a page somebody lands on from a mail client.

Translations ship in `en` and `de`, as PHP files for the server and a flat JSON file for the
Control Panel's Vue layer.
