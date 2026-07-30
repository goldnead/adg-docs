# Storage drivers

Three addons let you choose where their **configuration** lives: in the database,
or as human-readable YAML under `content/`, git-versioned alongside the rest of
the site. Runtime data is never given that choice.

| Addon | Config storage | Runtime data |
| --- | --- | --- |
| [Webhook Manager](/webhook-manager/storage) | `eloquent` (default) or `flat` | deliveries and logs: always eloquent |
| [LeadHub](/leadhub/storage) | `eloquent` (default) or `flat` | sync log: eloquent only, skipped on flat |
| [Marketing](/marketing/lists) | `flat` (default) or `eloquent` | subscriptions, messages, events: always eloquent |
| Automations | eloquent, with optional JSON file sync | runs: always eloquent |

## Why the split

Configuration is authored, reviewed and deployed. It belongs in git, next to the
blueprints and templates that reference it, and a code review should be able to
show that a webhook's destination changed.

Runtime data is telemetry: delivery attempts, message records, timeline events,
open pixels. It is high-volume, append-heavy, and useless in a diff. It goes in
the database, always, in every driver.

That is why "flat driver" never means "no database". It means your *webhooks*
are files and your *deliveries* are rows.

## Which one to pick

Choose **flat** when the data is small, authored by developers, and belongs in
version control. Statamic projects that keep everything in `content/` will want
it, and it is Marketing's default for exactly that reason.

Choose **eloquent** when you have volume or need real filtering. LeadHub draws
the line explicitly:

> Best for ≤500 contacts and ≤10k timeline events. Beyond that, performance
> suffers.

Above that, or if you need queued CSV exports past the threshold, use eloquent.

Some features are eloquent-only, because they are relational: LeadHub's
CRM-core modules (ingestion, companies, tasks, pipelines, merge, scoring) all
require it, and the dedicated sync-log table is skipped gracefully on flat.

## Migrating between drivers

Every addon that offers a choice offers a migration, records are copied
id-for-id, and every one of them takes `--dry-run`:

```bash
php artisan webhook-manager:storage:migrate --from=eloquent --to=flat --dry-run
php artisan webhook-manager:storage:migrate --from=eloquent --to=flat

php artisan leadhub:storage:migrate --from=eloquent --to=flat
php artisan leadhub:storage:migrate --from=flat --to=eloquent
```

Then set the driver and clear caches:

```dotenv
LEADHUB_DRIVER=flat
WEBHOOK_MANAGER_DRIVER=flat
MARKETING_DRIVER=eloquent
```

Webhook Manager can also do the whole thing from the Control Panel under
**Settings → Storage**: it migrates the existing config to the target store and
activates it, no `.env` access needed. A choice made there is persisted under
`storage/` and **takes precedence over the config and env default** — worth
knowing when the env var says one thing and the CP says another.

## Flat-file indexes

The flat drivers keep a JSON index so a lookup does not read every file:

```
storage/app/leadhub/index/
  contacts.json
  tags.json
  form_mappings.json
```

Indexes are rebuilt automatically when a file's mtime drifts. If you edit the
YAML by hand, or a deploy rewrites mtimes, rebuild explicitly:

```bash
php artisan leadhub:stache:warm
php artisan leadhub:stache:warm --clear    # full rebuild
```

## Flat files and brands

A query cannot be scoped, so the flat drivers isolate by directory:

```
content/marketing/
  acme/lists/newsletter.yaml
  contoso/lists/updates.yaml
```

Files still sitting in the un-prefixed layout are read as the default brand's,
so a single-brand install that switches multi-brand on keeps working. Move them
when the second brand arrives with `marketing:migrate-flat-brands`, which only
ever moves, never overwrites, never deletes, and is a no-op on a second run.

LeadHub's flat driver mirrors segment handles onto each contact's YAML rather
than keeping a pivot table, so `segment_handles` is a field you will see in the
file. Read it with the contact's `uuid`, not its `id`.

## A Statamic gotcha worth repeating

Statamic's Stache can live in the database `cache` table. If you import a
database from another environment — a production copy into a local install, say —
the serialised cache contains that environment's absolute paths, and the site
dies with `entryClass() on null`.

```bash
php artisan cache:clear
php artisan stache:clear
php artisan stache:warm
```

This is Statamic behaviour rather than anything these addons do, but it will look
like an addon bug the first time it happens.
