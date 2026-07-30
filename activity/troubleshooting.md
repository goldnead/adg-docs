# Troubleshooting

<AddonHeader />

## Nothing is being recorded

Recording is **fail-safe**: a ledger failure is reported and swallowed so it cannot roll back the purchase
that produced the event. Which means **`laravel.log` is the only place the reason exists.**

Check, in order:

1. `activity.enabled` — `false` makes every `record()` a no-op.
2. Is anything actually recording? Installing the addon collects nothing on its own. Either a bundled
   producer needs its sibling addon installed, or you need to call `record()`.
3. `producers.marketing` / `producers.leadhub` — and whether that sibling addon is installed at all.
4. `laravel.log`.

## Rows exist but a query returns nothing

Multi-brand, no current brand, `fail_mode=closed`. This is the design and it will catch you in `tinker` and
in every console command, both of which have no session.

```php
BrandContext::runFor('acme', fn () => Activity::query()->count());
BrandContext::withoutBrandScope(fn () => Activity::query()->count());   // all brands
```

## One event type stopped growing

Almost certainly an **empty-but-present dedupe key**.

`(brand_id, dedupe_key)` is unique and deliberately not binding for `null`. But `''` **is** a value, so every
event of that type in the brand collapses onto one row — the first one — and every subsequent record returns
it and writes nothing.

Find the producer and make it write `null`:

```php
'dedupe_key' => $key ?: null,      // not $key ?? ''
```

## Duplicate rows for one fact

The opposite mistake: no dedupe key on a state transition, or a key built from the moment rather than the
fact.

```php
'dedupe_key' => 'order:'.$order->id,   // a fact
'dedupe_key' => 'order:'.now(),        // a moment — a retry duplicates
```

Note that duplicates are correct for **repeatable** facts. A second email open is a second fact.

## Two rows per event

A producer registered twice — except that is not possible: registering the same event class again
**replaces** the mapper and never adds a second listener.

So two rows means two *different* producers mapping the same underlying event, or your own `record()` call
alongside a bundled producer. Turn one off:

```php
'producers' => ['leadhub' => false],
```

## `ImmutableActivity` thrown

You tried to update or delete a row. `activities` is append-only, and the retention and anonymisation
commands are the only paths that lift the guard.

Correct a wrong fact by **recording a correcting one**.

## A queued write has the wrong actor or no brand

`recordLater()` captures the actor and the request context **at dispatch**, never in the worker. If the
actor is `system` when you expected a user, the dispatch happened somewhere without one — a listener running
in a worker, for instance.

Capture it explicitly at the point where you still have it:

```php
Activity::recordLater('…', ['actor' => IdentityContext::current(), /* … */]);
```

## The upgrade migration refuses to run

A stored `subject_type` exceeds 191 characters or a `subject_id` exceeds 128.

That is deliberate: **nothing is truncated to fit.** Both columns go into `act_brand_subject_idx`, and under
`utf8mb4` every character costs four bytes of InnoDB's 3072-byte limit.

Find and fix the offending rows — usually a producer writing something into `subject_id` that is not a
database identifier, like a URL or a serialised value.

## A property is missing from a row

The sanitizer stripped it. `strip_keys` matches at **any depth**, so a nested `token` or `iban` is redacted
too.

If a legitimate field shares a name with a secret-shaped key, rename the field. Removing the key from
`strip_keys` is the wrong trade.

## A payload shows a marker instead of data

It exceeded `max_payload_bytes` (60,000 by default) and was replaced with a **visible marker** rather than
silently truncated — so that you can tell "too much was there" from "nothing was there".

Record less. A 60 KB fact is usually a serialised model that should have been three fields.

## An event type never appears

Check `sanitizer.blocked_event_types`, and check whether a custom `ActivitySanitizer` is bound that returns
`null` for it. Both drop the activity before it is written, silently and by design.

## The table is enormous

There is **no scheduled prune** — deliberately, because a retention period is a policy decision. Set one:

```php
'retention' => [
    'per_event_type' => ['marketing.email_opened' => 90],
],
```

```php
Schedule::command('activity:prune --days=365')->weekly();
```

`marketing.email_opened` will dominate the table long before anything else does, and it is the least
trustworthy row you hold — see [Marketing → Tracking](/marketing/tracking#opens).

## A metric query is slow

`properties` is a JSON column with no index. Filtering or aggregating on a key inside it will not use an
index at any volume.

The indexes that exist are `(brand_id, dedupe_key)`, `event_id` and
`(brand_id, subject_type, subject_id)`. If you query by a property regularly, that property wants to be a
column in a read model of yours, refreshed on a schedule from the ledger.

That separation is the reason this addon has no aggregates. See
[Boundaries](/guide/boundaries#ledger-vs-analytics).

## `activity:anonymize` seems to have done nothing

It is **idempotent**, so a second run over the same rows is a no-op. The rows will already show
`anonymized`.

Also note that it keeps the join keys, so a query by `contact_uuid` still finds them. What is gone is
`email`, `name` and `meta`. That is the point — the fact stays countable and the person is no longer
identifiable.

## The CP screen is missing

```php
'cp' => ['enabled' => true],
```

And the `view activity` permission. If the whole section is absent rather than empty, it is one of those
two.

## I expected LeadHub's timeline to move here

It does not, and it will not. `leadhub_events` is the CRM's own contact timeline and stays untouched;
installing Activity migrates nothing.

The bundled producer records the same facts for a different purpose, and the overlap is intended. See
[Boundaries](/guide/boundaries#crm-timeline-vs-activity-ledger).
