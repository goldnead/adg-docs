# Brands & multi-tenancy

Twelve of the addons depend on `goldnead/statamic-brand-context`. On an ordinary
install you will not notice: one brand exists, every record is stamped with it,
the global scope is a no-op and no switcher appears anywhere in the Control
Panel.

The full reference is in the [Brand Context section](/brand-context/). This page
is the part every other addon's documentation assumes you know.

## The two modes

```php
// config/brand-context.php
'multi_brand' => env('BRAND_CONTEXT_MULTI_BRAND', false),
```

**Off (default).** A default brand is created. `brand_id` is stamped on create
and ignored on read. Nothing is hidden from anybody.

**On.** The global scope filters every `HasBrand` model by the current brand, new
records are stamped with it, and the CP brand switcher appears.

The database schema is **identical in both modes** — `brand_id` is present from
the first migration and backfilled to the default brand — so turning multi-brand
on later requires no migration. That is the single most important property of
this design, and it is why every addon in the suite carries the column whether
you use it or not.

## Fail closed

```php
'fail_mode' => env('BRAND_CONTEXT_FAIL_MODE', 'closed'),
```

In multi-brand mode, with no current brand resolved, a query on a branded model
returns **no rows**. Not all rows.

That is the whole safety argument, and it has a consequence you will meet the
first time you run a console command: a queue worker and an Artisan command have
no session, therefore no current brand, therefore see nothing. Name the brand:

```php
BrandContext::runFor('acme', fn () => Contact::create([...]));
```

Or use the `RunsForEachBrand` trait in a command that should sweep all of them.

Every scheduled command in the suite does this and accepts `--brand=` to narrow the
run — with one deliberate exception:

| Command | `--brand=` | |
| --- | --- | --- |
| `activity:prune`, `activity:anonymize` | no | Deliberate: a retention sweep is an operator action on the whole store, not a brand-scoped query. |

::: warning LeadHub before 1.10.3
`leadhub:segments:sweep`, `leadhub:followups:digest` and `leadhub:followups:due` did
not iterate brands and took no `--brand`. They met the fail-closed scope, queried an
empty database, and reported success — `Swept 0 segment(s)` reads as "nothing to do"
and meant "I could not see anything".

Fixed in `^1.10.3`. See
[Queues & scheduling](/guide/queues#multi-brand-and-the-console).
:::

Explicit cross-brand access is opt-in and deliberately ugly to type:

```php
BrandContext::withoutBrandScope(fn () => Contact::count());
```

## What is scoped, and what is not

Scoping is an Eloquent mechanism. Three things in the suite therefore need their
own answer:

**Statamic users** are not Eloquent models — under the file users repository they
are not database rows at all. "The users of this brand" comes from
`BrandMembers` instead. See [Brand members](/brand-context/members), including
the rule that surprises everybody: *a user with no membership at all counts as a
member of every brand.*

**Flat-file storage** cannot be scoped by a query. The addons that support a
flat driver isolate by directory instead:

```
content/marketing/            content/leadhub/
  acme/lists/newsletter.yaml    acme/contacts/{uuid}.yaml
  contoso/lists/updates.yaml    contoso/contacts/{uuid}.yaml
```

The brand is in the **path**, never a key inside the file. A read then never opens
another brand's file, and a file in the wrong place is visible in `ls` and in a
diff — where a key would make isolation a filter somebody has to remember, and a
misspelt one would fall through to the default brand.

A single-brand install keeps the plain un-prefixed layout, and files still in it
are read as the default brand's — and only the default brand's — even after
multi-brand is switched on. Move them when a second brand appears:

```bash
php artisan marketing:migrate-flat-brands --dry-run
php artisan marketing:migrate-flat-brands

php artisan leadhub:migrate-flat-brands --dry-run     # LeadHub 1.11+
php artisan leadhub:migrate-flat-brands
php artisan leadhub:stache:warm --clear
```

Both only ever move, never overwrite, and are a no-op on a second run.

**Public routes** have no session, so a confirmation link in an email would hit
the fail-closed scope and find nothing. The brand comes from the token in the URL
instead; see [Public routes](/brand-context/public-routes).

## Uniqueness is per brand

Once brands exist, "unique" almost always means "unique within a brand". In the
suite that applies to:

| Addon | Unique per brand |
| --- | --- |
| LeadHub | contact email (normalised), tag slug, pipeline slug, event `dedupe_key`, form mapping `form_handle`, segment handle |
| Marketing | one subscription per list per address |
| Activity | `dedupe_key` |
| Notifications | one preference row per recipient/type/channel, one digest run per recipient/frequency/window |

Two brands may legitimately hold the same email address with independent consent
state. That is the point.

The exception, and it is deliberate: **Marketing list handles are unique across
all brands.** The public subscribe endpoint derives the brand from the list
handle the form names, which means no brand in the URL, no session, and nothing
for a visitor to get wrong. That only holds while a handle has exactly one
owner, so creating a duplicate is refused with a message naming the brand that
holds it.

## Checking that the database agrees

`php artisan migrate` reporting success means the migrations ran. Whether the
per-brand unique indexes are actually in place, and whether the existing rows
satisfy them, is a different question:

```bash
php artisan leadhub:brand-integrity            # reports, changes nothing
php artisan leadhub:brand-integrity --repair   # rebuilds the indexes only
```

These commands print every colliding row and never delete one. Which of two
contacts is *the* contact is not a decision a schema change gets to make.
