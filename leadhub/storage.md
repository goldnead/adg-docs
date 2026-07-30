# Storage drivers

<AddonHeader />

LeadHub ships with two storage drivers. Unlike the other addons in the suite, the choice here
covers **the data itself**, not just configuration.

```php
'storage' => [
    'driver' => env('LEADHUB_DRIVER', 'eloquent'),   // eloquent | flat
    'flat' => [
        'path' => env('LEADHUB_FLAT_PATH', base_path('content/leadhub')),
        'index_disk' => env('LEADHUB_INDEX_DISK', 'local'),
        'index_path' => env('LEADHUB_INDEX_PATH', 'leadhub/index'),
    ],
],
```

## `eloquent` — the default

Dedicated tables: `leadhub_contacts`, `leadhub_events`, `leadhub_notes`, `leadhub_tags`,
`leadhub_contact_tag`, `leadhub_followups`, `leadhub_form_mappings`.

- Best for any project with **more than 500 contacts** or **more than 10k timeline events**
- Performant filtering, sorting and full-text search
- Required for queued exports past the threshold
- **Required for every CRM-core module**: ingestion, companies, tasks, pipelines, merge,
  scoring
- Standard Laravel migrations

## `flat` — Statamic-native

Leads as YAML files, with a Stache-style JSON index for fast lookups.

```
content/leadhub/
├── contacts/
│   └── {uuid}.yaml          # 1 file per contact, notes embedded, tag_ids inline
├── events/
│   └── {uuid}.jsonl         # append-only timeline log per contact
├── followups/
│   └── {uuid}.jsonl         # append-only follow-up history per contact
├── tags.yaml
└── form-mappings.yaml

storage/app/leadhub/index/   # JSON indexes, auto-rebuilt on file mtime drift
├── contacts.json
├── tags.json
└── form_mappings.json
```

- True to Statamic's flat-file ethos, and lead data is git-versionable
- Zero database required
- **Best for ≤500 contacts and ≤10k timeline events.** Beyond that, performance suffers.

::: danger Lead data in git means personal data in git
The eloquent driver's trade-off is a database. The flat driver's trade-off is that names,
email addresses, phone numbers and message bodies are committed, pushed, and present in every
clone and every history rewrite you will ever do.

For a handful of B2B inquiries that may be fine. For a public repository, or a consumer site, it
is not. Decide before the first submission, not after.
:::

## Choosing

| | `eloquent` | `flat` |
| --- | --- | --- |
| Contacts | any number | ≤500 |
| Timeline events | any number | ≤10k |
| CRM-core modules | yes | **no** |
| Sync log table | yes | skipped, timeline entry still written |
| Queued exports | yes | no |
| Lead data in git | no | yes |
| Segments | pivot table | mirrored onto contact YAML |

If you are unsure, use `eloquent`. It is the default, it is where the features are, and moving
to flat later is one command.

## Switching drivers

You can move existing data between drivers without losing anything:

```bash
# database → YAML
php artisan leadhub:storage:migrate --from=eloquent --to=flat

# YAML → database
php artisan leadhub:storage:migrate --from=flat --to=eloquent

# see what would move, first
php artisan leadhub:storage:migrate --from=eloquent --to=flat --dry-run
```

Then set the driver and clear caches:

```dotenv
LEADHUB_DRIVER=flat
```

```bash
php artisan cache:clear
php artisan stache:clear && php artisan stache:warm
```

The original Statamic form submissions remain untouched either way. LeadHub stores only
references and a redacted payload copy, regardless of driver.

## Rebuilding the flat indexes

Indexes rebuild automatically when a file's mtime drifts. If you edit the YAML by hand, or a
deploy rewrites mtimes, rebuild explicitly:

```bash
php artisan leadhub:stache:warm
php artisan leadhub:stache:warm --clear   # full rebuild
```

## Checking per-brand uniqueness

Five identifiers are unique **per brand** rather than globally: a contact's normalised email, a
tag slug, a pipeline slug, an event `dedupe_key`, a form mapping's `form_handle`, and a segment
handle.

Whether the database is actually enforcing that is a different question from whether the
migrations ran:

```bash
php artisan leadhub:brand-integrity            # reports; changes nothing
php artisan leadhub:brand-integrity --repair   # rebuilds the indexes only
```

It prints every colliding row it finds and **never deletes one**. Which of two contacts is *the*
contact is not a decision a schema change gets to make, and `--repair` refuses to build an index
while anything would have to go for it.

Worth running after any update that touched migrations, and specifically for the 1.10.1 release.

## The flat driver and UUIDs

::: warning Read `uuid`, not `id`
On the flat driver a contact's stable identifier is its **UUID**. Casting it to `int` yields
`0`, which collapses every contact onto one — and that is a real trap, not a hypothetical, in
code that assumed an integer key.

This applies to segment handle mirroring (`segment_handles` in the contact YAML) and to any
consumer reading contact ids from the flat store.
:::

## Multi-brand on the flat driver

::: danger LeadHub's flat driver is single-brand
It has **no brand concept at all**. `FileStore` is a singleton bound to one path
(`leadhub.storage.flat.path`), and nothing in the flat repositories reads or writes a brand.
`content/leadhub/contacts/` is one undifferentiated set of YAML files.

So on a multi-brand install with `LEADHUB_DRIVER=flat`, every brand reads every brand's
contacts. There is no isolation to lose because there was never any.

**Use the eloquent driver if you run multi-brand.** That is where the per-brand uniqueness,
the global scope and every CRM-core module live anyway.
:::

`leadhub:storage:migrate` enforces this rather than letting you walk into it:

- `--to=flat` with more than one brand is **rejected** — migrating a second brand into the
  same directory would merge the two, and nothing in the files could tell them apart
  afterwards.
- `--from=flat` with more than one brand **requires `--brand`**, because one flat store
  cannot be split across several.

Both need LeadHub **1.10.4**. Before that the command took no brand at all, read an empty
database through the fail-closed scope, and reported a successful migration of nothing.

To keep a brand on flat storage deliberately, give it a directory of its own by pointing
`leadhub.storage.flat.path` somewhere per brand before you migrate.

::: tip Marketing is the other way round
Marketing's flat driver **does** isolate by directory — `content/marketing/acme/lists/…` —
and ships `marketing:migrate-flat-brands` to move an existing single-brand layout into it.
Do not assume the two addons behave the same here; they do not.
:::

See [Brands & multi-tenancy](/guide/brands#what-is-scoped-and-what-is-not).

## Stache after a database import

Statamic's Stache can live in the database `cache` table, and the serialised cache holds the
*other* environment's absolute paths. After importing a production database locally:

```bash
php artisan cache:clear
php artisan stache:clear
php artisan stache:warm
```

Without it the site dies with `entryClass() on null`, which looks like an addon bug and is not.
