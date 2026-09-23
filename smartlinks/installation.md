# Installation

<AddonHeader />

<Requirements laravel="12.40+ / 13.x" />

```bash
composer require goldnead/statamic-smartlinks
php artisan migrate
```

The migration creates one table, `smartlinks_clicks`. There is no install command, and no
other addon of the suite is required.

Then tell it where the links are. Publish the config and set the collection and the field:

```bash
php artisan vendor:publish --tag=smartlinks-config
```

```php
'collections' => ['songs'],        // whose entries get a page
'field' => 'streaming_links',      // Grid/Replicator, or a List of URLs
'url_key' => 'url',                // the URL column in a Grid row
'spotify_field' => 'spotify_id',   // for auto-fill
```

The defaults are the ones above, so a site whose songs already live in a `songs` collection
with a `streaming_links` Grid needs no config at all. Every key is on
[Configuration](/smartlinks/configuration).

## The blueprint

Give the URL column of the links field the **Streaming URL** fieldtype (`smartlink_url`). It
shows the detected platform next to each URL as you type, and an unknown host as "Other". A
hand-typed `platform` column you already have is ignored and can go. See
[Platform detection](/smartlinks/platforms#in-the-entry-form).

## The scheduler

Click counters are kept until you delete them. `smartlinks:prune` deletes the ones older than
400 days, but nothing runs it for you. Register it in `routes/console.php`:

```php
Schedule::command('smartlinks:prune')->daily();
```

See [Configuration](/smartlinks/configuration#pruning) and
[Queues & scheduling](/guide/queues#what-is-scheduled). Nothing in the addon is queued.

## Permissions

One, under the group **Smart Links** in a role's permissions:

| Permission | Allows |
| --- | --- |
| `view smartlinks` | the [Smart Links](/smartlinks/control-panel) screen |

The landing page and the redirect are public and need no permission.

## Publishable tags

| Tag | What it publishes |
| --- | --- |
| `smartlinks-config` | `config/smartlinks.php` |
| `smartlinks-migrations` | The migration, into `database/migrations/` |
| `smartlinks-views` | `landing.blade.php`, into `resources/views/vendor/smartlinks/` |
| `smartlinks-translations` | The language files (English and German), into `lang/vendor/smartlinks/` |

The migration runs from the package without being published. The Control Panel bundle ships
compiled under `dist/build/` and Statamic publishes it on install. A fresh install whose
migration has not run gets a sentence on the Smart Links screen, not an error.

## Licence

Commercial: `composer.json` says `proprietary`, with no editions. It is on Packagist, but it
is not sold today, neither on its own nor as part of the Suite: Schedule A of the
[Suite EULA](/guide/suite-eula) lists it with the packages that agreement does not cover.
See [Licensing](/guide/licensing).
