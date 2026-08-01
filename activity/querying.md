# Querying

<AddonHeader />

```php
use Goldnead\Activity\Facades\Activity;

Activity::query()
    ->ofType('commerce.purchase_completed')
    ->occurredBetween($from, $to)
    ->get();
```

`Activity::query()` returns a **brand-scoped Eloquent builder**, so everything you know about Eloquent
applies, plus three scopes:

| Scope | Purpose |
| --- | --- |
| `ofType($type)` | Filter by event type |
| `forIdentity($identity)` | Everything an actor did, by whichever join key resolves |
| `occurredBetween($from, $to)` | A time window |

## Actor or subject

The distinction that decides how you query:

```php
// everything Adrian did
Activity::query()->forIdentity($identity)->get();

// everything that happened to order 4711
Activity::query()
    ->where('subject_type', Order::class)
    ->where('subject_id', $order->id)
    ->get();
```

`forIdentity()` is the one worth using rather than hand-writing. An identity may join by `user_id`,
`contact_uuid` or `anonymous_id`, and the scope handles whichever is present — which is what lets an
anonymous visitor's pre-identification activity be found after they become a known contact.

## Building metrics

The ledger stores facts and computes nothing, so a metric is your query:

```php
$purchases = Activity::query()
    ->ofType('commerce.purchase_completed')
    ->occurredBetween(now()->startOfMonth(), now())
    ->count();

$revenue = Activity::query()
    ->ofType('commerce.purchase_completed')
    ->occurredBetween(now()->startOfMonth(), now())
    ->get()
    ->sum(fn ($a) => $a->properties['amount'] ?? 0);
```

::: tip Aggregate in your layer, not in the ledger
That second example pulls rows into PHP to sum a JSON field, which is fine for a month of purchases and
wrong for a year of email opens.

For anything you compute repeatedly: put the number in a read model of your own, refreshed on a schedule
from the ledger. That is exactly the separation the ledger exists to enable — and the reason there are no
aggregates in this addon. See [Boundaries](/guide/boundaries#ledger-vs-analytics).
:::

## Indexes, and what queries them

The ledger is indexed for the queries it was designed for. Two worth knowing about:

```
(brand_id, dedupe_key)      unique
event_id                    unique
act_brand_subject_idx       (brand_id, subject_type, subject_id)
```

So brand + subject is fast. **Filtering on a key inside `properties` is not** — it is a JSON column with no
index. If you find yourself querying by a property regularly, that property wants to be a column in a read
model of yours.

## The Control Panel inspector

**Tools → Activity**, behind `view activity`. Filter by event type, contact, user, source and date range;
open a single fact to read its properties and context.

```php
'cp' => ['enabled' => true, 'per_page' => 50],
```

Read-only, with no counts, charts or aggregates. It answers "did this happen, and what exactly was
recorded", which is the support question.

Turning it off is reasonable on a production site where the ledger is machine-read and a human browsing
personal facts is not a use case you want to offer.

## Multi-brand

`Activity::query()` is brand-scoped and **fails closed**: with multi-brand on and no current brand, it
returns **no** rows.

That will surprise you in `tinker` and in a console command, both of which have no session:

```php
BrandContext::runFor('acme', fn () => Activity::query()->count());
BrandContext::withoutBrandScope(fn () => Activity::query()->count());   // all brands
```

The second form is the deliberate escape hatch for operator-level work. Do not use it inside a request that
serves one brand's user.

## What you cannot query

**Anonymised rows have lost their join keys.** `activity:anonymize` nulls `contact_uuid`, `user_id`,
`anonymous_id`, `session_id`, `actor_id`, `properties` and `context`, and sets `anonymized` to `true`. What
remains is `event_type`, `occurred_at`, `source`, `subject_type`, `subject_id` and the ids.

So the fact stays countable and the person is no longer reachable: a query by `contact_uuid` after the run
returns **nothing**. Aggregate on `event_type` and `occurred_at` instead, and filter with
`where('anonymized', false)` when a report must only cover rows that are still attributable.

There is nothing to strip called `email`, `name` or `meta` — the table has no such columns. Personal detail
lives in `properties` and `context`, and both are emptied.

**Pruned rows are gone.** `activity:prune` deletes.

**Raw user agents and IPs were never stored.** Only a coarse device category — `mobile`, `desktop`,
`tablet`, `bot` or `unknown` — and no IP at any setting. If a report needs a country, it has to have been derived
upstream and passed in `properties`.

## Reading a row

| Column | Contains |
| --- | --- |
| `event_type` | the catalogue name |
| `actor_type`, `actor_id` | who |
| `contact_uuid`, `user_id`, `anonymous_id` | join keys |
| `subject_type`, `subject_id` | what it was about |
| `properties` | the fact's data, sanitised |
| `context` | UTM, referrer, page URL, device category |
| `source` | which application recorded it |
| `occurred_at` | when it happened |
| `received_at` | when the ledger heard about it |
| `anonymized` | whether the personal fields have been stripped |

`occurred_at` and `received_at` differ for a backfill and for a queued write. Order by `occurred_at` when you
want the story, and by `received_at` when you are debugging the pipeline.
