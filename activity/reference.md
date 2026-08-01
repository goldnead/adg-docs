# Reference

<AddonHeader />

## Console commands

| Command | Purpose |
| --- | --- |
| `activity:prune [--days=] [--dry-run]` | Delete rows past a retention window |
| `activity:anonymize [--contact=] [--user=] [--anonymous-id=] [--days=] [--dry-run]` | Null the identifying columns, keep the row |

Both run across **all brands**. Neither is scheduled for you — a ledger's retention period is a policy
decision.

`prune` needs either `--days`, a `retention.days` value or at least one `retention.per_event_type` entry;
with none of the three it reports that nothing is configured and exits.

`anonymize` needs at least one of `--contact`, `--user`, `--anonymous-id` or `--days`; with none it refuses
rather than sweeping the table. `--days` falls back to `retention.anonymize_after_days`.

`anonymize` is idempotent: rows already marked `anonymized` are excluded from the query.

## Facade

```php
use Goldnead\Activity\Facades\Activity;
```

| Method | Purpose |
| --- | --- |
| `record(string $type, array $attributes = [])` | Write a fact. Never throws. Returns the `Activity` or `null`. |
| `recordLater(string $type, array $attributes = [])` | Queue the write. Context captured **at dispatch**. Returns `void`. |
| `write(ActivityData $data, bool $hydrate = true)` | Persist a `ActivityData` you built yourself. Pass `false` to skip actor resolution and context capture. |
| `hydrate(ActivityData $data)` | Resolve the actor, capture context and fill the brand, without writing. Returns the completed `ActivityData`. |
| `registerProducer(string $eventClass, Closure $mapper, ?string $type = null)` | Map a domain event. **Replaces** an existing mapper. |
| `producers()` | The `ProducerRegistry` itself — for `registerMany()`, `has()`, `registered()`, `forget()` |
| `query()` | Brand-scoped Eloquent builder |
| `enabled()` | Whether recording is on (`activity.enabled`) |

`write()` and `hydrate()` are the seam for a producer that has already assembled the data and does not want
`record()` to re-derive any of it. `hydrate($data)` then `write($data, hydrate: false)` gives you the chance
to inspect or adjust the completed row between the two steps.

### `record()` attributes

| Key | Type |
| --- | --- |
| `actor` | `Identity` \| `ProvidesIdentity` \| `Authenticatable` \| email string |
| `subject` | any Eloquent model — fills `subject_type` and `subject_id` |
| `subject_type` · `subject_id` | strings, if you want to set them without a model |
| `contact_uuid` | string — the LeadHub contact this is *about*, which is often not the actor |
| `user_id` | string |
| `anonymous_id` | string |
| `session_id` | string |
| `source` | string — used instead of the configured `activity.source` |
| `brand_id` | int — used instead of the current brand |
| `dedupe_key` | string \| **null** (never `''`) |
| `event_id` | string |
| `properties` | array |
| `context` | array — merged over whatever `ContextCapture` collects; your keys win |
| `occurred_at` | datetime |

`contact_uuid`, `user_id` and `anonymous_id` are explicit join keys and take precedence over the ones the
actor would have supplied. That distinction is the point: a CP user changing a contact's status is the
actor, and the contact is who the fact is *about*. The bundled LeadHub producer sets `contact_uuid` for
exactly this reason.

### Query scopes

| Scope | |
| --- | --- |
| `ofType($type)` | filter by event type |
| `forIdentity($identity)` | joins by `user_id`, `contact_uuid` or `anonymous_id`, whichever is present |
| `occurredBetween($from, $to)` | a time window |

## Contracts

| Contract | Bind to |
| --- | --- |
| `Goldnead\Activity\Contracts\ActivitySanitizer` | redact, reshape or drop before persisting. Returning `null` drops the activity. |

From `goldnead/statamic-identity-contracts`: `ContactLocator` (email → contact UUID) and
`AnonymousIdResolver` (the pseudonymous visitor id).

## Events

| Event | Fired |
| --- | --- |
| `Goldnead\Activity\Events\ActivityRecorded` | Once per fact **actually written**, carrying the `Activity` as `$activity` |

A deduplicated write returns the row that already existed and fires **nothing**. To a read model that is not
a new event, and treating it as one is how a downstream counter double-counts. **1.1+**

```php
Event::listen(ActivityRecorded::class, function (ActivityRecorded $event) {
    MyReadModel::apply($event->activity);
});
```

This is the hook to build a read model on. Polling the table is the alternative, and it is worse in every
respect.

## Exceptions

| Exception | Thrown when |
| --- | --- |
| `ImmutableActivity` | An update or delete is attempted on an `activities` row |

## Schema

`activities`:

```
brand_id, event_id, event_type,
actor_type, actor_id,
contact_uuid, user_id, anonymous_id, session_id,
source,
subject_type, subject_id,
dedupe_key, properties, context,
anonymized, occurred_at, received_at
```

**Unique:** `(brand_id, dedupe_key)`, `event_id`.
**Index:** `act_brand_subject_idx` on `(brand_id, subject_type, subject_id)`.

### Column caps, and why they exist

`subject_type` is capped at **191** characters (it holds a class name) and `subject_id` at **128** (a
database identifier — an integer, a UUID, a Statamic ID).

Both go into `act_brand_subject_idx`, and under `utf8mb4` every character costs four bytes of InnoDB's 3072
per index. **Nothing is truncated to fit**: the upgrade migration refuses to run if a stored value exceeds
either cap.

### The nullable-dedupe-key rule

`(brand_id, dedupe_key)` is deliberately **not binding for rows without a dedupe key** — those are facts
nobody asked to be deduplicated, and `event_id` holds them instead.

::: danger A producer that cannot build a key must write `null`
Never an empty-but-present one. `''` **is** a value, so it would be constrained, and every event of its type
in the brand would collapse onto one row.
:::

## Permissions

| Permission | Grants |
| --- | --- |
| `view activity` | the read-only inspector at **Tools → Activity** |

One permission, because there is one thing to permit. Retention and anonymisation are artisan-only paths,
and artisan does not consult Gates, so there is nothing a second permission could govern. A
`manage activity retention` permission existed up to **1.0.6** and was checked nowhere; it was removed in
**1.1.0**. Anyone who can run `php artisan` can run both commands, and access to the console is the control.

## Bundled producers

**Marketing** — `marketing.subscription_pending | subscription_confirmed | unsubscribed`,
`marketing.campaign_sending | campaign_sent`,
`marketing.email_sent | email_opened | email_clicked | email_bounced | email_complained`

**LeadHub** — `crm.contact_created | contact_updated | status_changed | score_changed | segment_entered |
opportunity_won | task_completed | …`

Both attach only when the sibling addon is installed. Event type names follow the platform catalogue rather
than PHP class names.

## Configuration

| Key | Default |
| --- | --- |
| `enabled` | `true` |
| `source` | `APP_NAME` |
| `queue.enabled` | `false` |
| `queue.connection` / `queue.queue` | app defaults |
| `queue.unique_for` | `3600` |
| `context.capture` | `true` |
| `context.utm` / `referrer` / `page_url` / `user_agent_category` | `true` |
| `sanitizer.strip_keys` | `password, token, secret, authorization, api_key, apikey, credit_card, card_number, cvv, iban, bic` |
| `sanitizer.blocked_event_types` | `[]` |
| `sanitizer.max_payload_bytes` | `60000` |
| `retention.days` | **unset** |
| `retention.anonymize_after_days` | **unset** |
| `retention.per_event_type` | `[]` |
| `producers.marketing` / `producers.leadhub` | `true` |
| `cp.enabled` | `true` |
| `cp.per_page` | `50` |

## Environment variables

```dotenv
ACTIVITY_ENABLED=true
ACTIVITY_SOURCE=
ACTIVITY_QUEUE=false
ACTIVITY_QUEUE_CONNECTION=
ACTIVITY_QUEUE_NAME=
ACTIVITY_CAPTURE_CONTEXT=true
ACTIVITY_RETENTION_DAYS=
ACTIVITY_ANONYMIZE_AFTER_DAYS=
ACTIVITY_PRODUCER_MARKETING=true
ACTIVITY_PRODUCER_LEADHUB=true
ACTIVITY_CP=true
```

## Requirements

<Requirements laravel="12.x or 13.x" queue="Optional. Only recordLater() uses it." />

Every entry below is a hard `require`, installed automatically by
`composer require goldnead/statamic-activity`:

| Package | Constraint |
| --- | --- |
| `php` | `^8.2` |
| `laravel/framework` | `^12.0\|^13.0` |
| `statamic/cms` | `^6.0` |
| [`goldnead/statamic-brand-context`](/brand-context/) | `^1.0` |
| [`goldnead/statamic-identity-contracts`](/identity-contracts/) | `^1.0` |

Brand Context and Identity Contracts are not optional integrations: Activity resolves the brand and the
actor through them on every write. Both behave inertly in a single-brand, no-CRM application, so you do not
have to configure either one.

## Guarantees

| | |
| --- | --- |
| Recording | never breaks the caller; failures are logged and swallowed |
| Existing fact | returns the original row, writes nothing |
| `event_id` | global uniqueness — the same physical event twice |
| `dedupe_key` | per-brand uniqueness — the same fact twice |
| Immutability | append-only; update or delete throws `ImmutableActivity` |
| Raw user agent | never stored, at any setting |
| IP addresses | never stored, at any setting |
| Sanitiser | runs on every write; redacts at any depth |
| Oversized payloads | replaced with a visible marker, never silently truncated |
| Brand scoping | `brand_id` from the first migration; fails closed |
| Retention | not scheduled for you |
| Aggregates | none, by design |

## By design, not missing

No counts, charts or aggregates · no analytics layer · no replacement of `leadhub_events` · no editing of a
recorded fact.
