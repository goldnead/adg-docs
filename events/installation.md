# Installation

<AddonHeader />

<Requirements php="8.2+" statamic="6.0+" laravel="12.40+ / 13.x" database="MySQL or SQLite" />

## Requiring it

```bash
composer require goldnead/statamic-events
php artisan migrate
```

The package is tagged and on Packagist, so nothing else is needed: no `repositories` block and
no `@dev` constraint. The Control Panel bundle is committed to the repository, so the screens
work straight after the install with no front-end build step.

## What comes with it

One hard requirement, pulled automatically:

| Package | Constraint | Why |
| --- | --- | --- |
| `goldnead/statamic-brand-context` | `^1.0` | Every event and every date carries a `brand_id` |

`statamic/cms ^6.0` and `laravel/framework ^12.40|^13.0` are in `require` as well.

Three suggestions, none of them required:

```
goldnead/statamic-activity       occurrence facts on the shared ledger
goldnead/statamic-automations    the four domain events as workflow triggers
goldnead/statamic-notifications  groundwork for reminders, planned for v1.2
```

Only the first has code in this package. The Automations entry describes what that addon can
already do with any Laravel event, and the Notifications entry describes a plan: there is **no
notifications bridge and no `bridges.notifications` config key** in v1.

## Migrations

Two, loaded automatically from the package. `php artisan migrate` after install is enough.

```
2026_08_02_000001_create_events_table
2026_08_02_000002_create_event_occurrences_table
```

`event_occurrences.event_id` has an `ON DELETE CASCADE` foreign key onto `events.id`. On SQLite
that only bites where foreign key enforcement is switched on, which is off by default in some
setups. On MySQL it always bites.

If you want the files in your own repository:

```bash
php artisan vendor:publish --tag=events-migrations
```

## Verifying it works

```bash
php artisan route:list --name=statamic.events
```

Two public routes, both unauthenticated:

```
GET  !/events/occurrences/{uuid}.ics   statamic.events.occurrence
GET  !/events/calendar.ics             statamic.events.feed
```

Then open the Control Panel. **Events** appears in the Content section for any user holding
`view events`.

::: tip Both public routes answer 404 rather than 403
A private event, a draft event and an unknown UUID are indistinguishable from outside. That is
deliberate: a 403 confirms that the id exists. See [Visibility](/events/visibility).
:::

## Publishing

```bash
php artisan vendor:publish --tag=events-config
php artisan vendor:publish --tag=events-translations
php artisan vendor:publish --tag=events-migrations
```

There is **no views tag**. The package ships no Blade views at all: the Control Panel is Vue on
Statamic's own publish form, and the ICS output is generated rather than templated.

The fourth tag, `events`, publishes the built Control Panel bundle to
`public/vendor/goldnead/statamic-events/build/`. Statamic runs it for you on install; you only
need it by hand after an upgrade that changed the bundle.

Translations ship in `en` and `de`, one file each.

## Switching the Control Panel off

```php
'cp' => [
    'enabled' => false,
],
```

This removes the nav entry **and** the thirteen Control Panel routes. Hiding the entry while
leaving the screens reachable by URL would not be a disabled Control Panel. The two public ICS
routes are unaffected, which is the point: a site that manages its events elsewhere can still
serve the feed.
