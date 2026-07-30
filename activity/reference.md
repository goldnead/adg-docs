# Reference

<AddonHeader />

## Console commands

| Command | Purpose |
| --- | --- |
| `activity:prune --days= [--dry-run]` | Delete rows past a retention window |
| `activity:anonymize [--contact=] [--user=] [--anonymous-id=] [--days=]` | Strip personal fields, keep the fact |

Both run across **all brands**. Neither is scheduled for you — a ledger's retention period is a policy
decision.

`anonymize` is idempotent.

## Facade

```php
use Goldnead\Activity\Facades\Activity;
```

| Method | Purpose |
| --- | --- |
| `record($type, array $attributes = [])` | Write a fact. Never throws. |
| `recordLater($type, array $attributes = [])` | Queue the write. Context captured **at dispatch**. |
| `registerProducer($eventClass, $mapper, $type = null)` | Map a domain event. **Replaces** an existing mapper. |
| `query()` | Brand-scoped Eloquent builder |

### `record()` attributes

| Key | Type |
| --- | --- |
| `actor` | `Identity` \| `ProvidesIdentity` \| `Authenticatable` \| email string |
| `subject` | any Eloquent model |
| `dedupe_key` | string \| **null** (never `''`) |
| `event_id` | string |
| `properties` | array |
| `occurred_at` | datetime |

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
| `manage activity retention` | the prune and anonymise operations |

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

<Requirements queue="Optional. Only recordLater() uses it." />

Requires `goldnead/statamic-brand-context` and `goldnead/statamic-identity-contracts`. Both behave inertly in
a single-brand, no-CRM application.

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
