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

Brands live in the **path**, not in the file:

```
content/leadhub/
  acme/
    contacts/{uuid}.yaml
    events/{uuid}.jsonl
    tags.yaml
  contoso/
    contacts/{uuid}.yaml
```

A read never opens another brand's file, and a file in the wrong place is visible in `ls`
and in a diff.

::: tip Why not a `brand:` key in each file
A contact's filename is its uuid, so listing one brand's contacts by key would mean opening
**every other brand's file** to discover it is not yours — an O(all brands) read for every
query, on the driver whose whole point is that there is no database.

And a missing or misspelt key falls through to the default brand: a leak that reads like a
typo. With a directory the isolation is structural rather than a filter somebody has to
remember to apply.
:::

**Single-brand installs change nothing.** No directory appears, nothing moves, there is
nothing to run.

### The pre-brand layout keeps working

Files still directly under `content/leadhub/` are read as the **default brand's** — and only
the default brand's, ever. They were written before brands existed, so they belong to the
brand every existing row was backfilled onto. An install that enables multi-brand never
opens to an empty contact list.

Make the arrangement explicit when a second brand arrives:

```bash
php artisan leadhub:migrate-flat-brands --dry-run   # show the moves
php artisan leadhub:migrate-flat-brands             # do them
php artisan leadhub:migrate-flat-brands --brand=acme
php artisan leadhub:stache:warm --clear             # rebuild the indexes
```

It only ever **moves**: never overwrites, never deletes, and a second run is a no-op.

### Fail closed

Multi-brand with no current brand — a console run, a queue worker — reads **nothing**, not
everything. That matches the eloquent driver's global scope, so the two drivers agree about
the one case where guessing would leak.

### The index is per brand too

`storage/app/leadhub/index/{brand}/…`. A shared index over correctly isolated files would be
the worst version of this bug: the data on disk right and the answer wrong.

::: warning Requires 1.11.0
Before that the flat driver had **no brand concept at all** — one directory, no brand in the
files, so on a multi-brand install every brand read every brand's contacts. If you are on
1.10.x with `LEADHUB_DRIVER=flat` and multi-brand on, you have no isolation. Upgrade, then
run `leadhub:migrate-flat-brands`.
:::

`leadhub:storage:migrate` still refuses to move several brands into one flat store in a
single run (1.10.4): the guard is about that command, not about where files land, and it
stays useful now that a per-brand target exists. Migrate one brand at a time.

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
