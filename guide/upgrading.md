# Upgrading

The addons are versioned independently and follow semantic versioning. A patch or
minor release needs `composer update` and `php artisan migrate`; a major release
gets an upgrade note in that addon's changelog.

```bash
composer update goldnead/statamic-*
php artisan migrate
php artisan cache:clear
php artisan stache:clear && php artisan stache:warm
```

Clearing the Stache is not optional after an update that touched a flat driver or
a collection. Statamic caches augmented data, and a stale cache after a schema
change presents as an addon bug.

## Order matters when two addons move together

Marketing requires LeadHub, so a release that spans both has one correct order:

1. Update and tag LeadHub.
2. Update Marketing, whose constraint now resolves.
3. `composer update` in the site.

Doing it the other way round leaves Composer unable to resolve, which is
annoying but harmless. Doing it the other way round *with loose constraints* is
worse: Marketing boots against a LeadHub that lacks the method it wants, and the
capability check degrades the feature silently. See
[Compatibility](/guide/compatibility#inter-addon-constraints).

## After every update that touched migrations

`php artisan migrate` reporting success means the migrations ran. It does not mean
the constraints they were supposed to leave behind are in place, and it says
nothing about the rows already in the tables. Three commands answer the second
question directly:

```bash
php artisan leadhub:brand-integrity
php artisan marketing:consent-integrity
php artisan notifications:uniqueness-integrity
```

All three report and change nothing. All three take `--repair`, which rebuilds
the index alone and **refuses while any conflicting row is still in the way** —
because which of two rows is the one to keep is a decision about people, not a
schema change.

If a migration stops and names duplicate rows, that is the designed behaviour.
Delete the rows that are not the ones to keep, then migrate again.

::: tip Why this exists at all
A unique index that leads with a nullable column constrains nothing, in any
engine. One release shipped a unique on `(user_id, …)` where `user_id` is NULL for
contact recipients, which meant duplicate preference rows on installs with
contact recipients, and a fully green SQLite test suite. The integrity commands
are the answer to "did that happen here".
:::

## MySQL versus SQLite

Worth repeating before you upgrade a production database: SQLite has no InnoDB
key-length limit, no fixed column widths and no per-character byte cost, so a
green test run against it says nothing about whether MySQL can build the schema
at all.

If you fork or extend one of these addons, run its MySQL suite before releasing:

```bash
vendor/bin/pest -c phpunit.mysql.xml
```

## Version-specific notes

The changelog in each addon section is the authoritative list. The ones most
likely to matter to an existing install:

| Addon | Release | What to do |
| --- | --- | --- |
| Notifications | before 1.0.4 | Duplicate preference rows are possible for contact recipients. Run `notifications:uniqueness-integrity`; migrate stops and names them if any exist. |
| Marketing | from 1.2.1 or earlier through 1.6.1–1.6.3 | Run `marketing:consent-integrity`. See the 1.6.4 changelog entry. |
| LeadHub | 1.10.1 | Per-brand unique indexes. Run `leadhub:brand-integrity`. |
| LeadHub | 1.1.0 | Segments arrive. Marketing's segment targeting needs this or later. |
| LeadHub | 0.3.0 | Control Panel rewritten on Inertia + Vue 3. Statamic 6 only; pin `^0.2.x` for Statamic 5. |
| LeadHub | 1.8.0 | Lead scoring moves from config to a per-brand database table. The config file remains the fallback while a brand has no rules, so nothing changes until you run `leadhub:scoring:import`. |
| Webhook Manager | 1.0.1 | Inbound route no longer 419s behind CSRF. |
| Automations | 1.0.3 | LeadHub action nodes fixed; before this they failed on every real install. |

## Republishing configuration

Publishing is not idempotent: `vendor:publish` will not overwrite a config file
you already have, which is correct, but it means new keys do not appear.

After a minor upgrade, diff your published config against the package's:

```bash
diff config/leadhub.php vendor/goldnead/statamic-leadhub/config/leadhub.php
```

New keys always have a documented default, and the addon reads that default when
your file omits the key. So an out-of-date config file is safe; it just hides
features from you.

## Republishing Control Panel assets

The compiled CP bundles ship with each package and Statamic publishes them on
install. If a screen renders blank or the browser console shows a missing chunk
after an upgrade, republish:

```bash
php artisan vendor:publish --tag=statamic-leadhub --force
php artisan statamic:install
```

::: warning `ViteManifestNotFoundException`
On a fresh or cold build this almost always means the `statamic:install` hook did
not run in `post-autoload-dump`, so no addon assets were published. Add it, and on
a cold Docker build make sure `CACHE_STORE=array` and the SQLite file exists
before the hook runs.
:::
