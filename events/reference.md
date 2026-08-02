# Reference

<AddonHeader />

## Routes

### Public

Prefix `/!/events/`, not configurable. Both routes are outside every auth middleware.

| Method | Path | Name | Guard |
| --- | --- | --- | --- |
| `GET` | `occurrences/{uuid}.ics` | `statamic.events.occurrence` | `isPubliclyReadable()`, else 404 |
| `GET` | `calendar.ics` | `statamic.events.feed` | `feeds.enabled`, else 404 |

`{uuid}` is constrained to `[0-9a-fA-F-]{36}`.

### Control Panel

Registered only when `events.cp.enabled` is true. With it false the route file returns before
registering anything: zero routes, not thirteen hidden ones. Names carry Statamic's
`statamic.cp.` prefix.

| Method | Path | Name | Gate |
| --- | --- | --- | --- |
| `GET` | `events` | `events.index` | `view events` |
| `GET` | `events/create` | `events.create` | `manage events` |
| `POST` | `events` | `events.store` | `manage events` |
| `GET` | `events/{event}` | `events.show` | `view events` |
| `GET` | `events/{event}/edit` | `events.edit` | `manage events` |
| `PATCH` | `events/{event}` | `events.update` | `manage events` |
| `DELETE` | `events/{event}` | `events.destroy` | `manage events` |
| `GET` | `events/{event}/occurrences/create` | `events.occurrences.create` | `manage events` |
| `POST` | `events/{event}/occurrences` | `events.occurrences.store` | `manage events` |
| `GET` | `events/occurrences/{occurrence}/edit` | `events.occurrences.edit` | `manage events` |
| `PATCH` | `events/occurrences/{occurrence}` | `events.occurrences.update` | `manage events` |
| `POST` | `events/occurrences/{occurrence}/cancel` | `events.occurrences.cancel` | `manage events` |
| `DELETE` | `events/occurrences/{occurrence}` | `events.occurrences.destroy` | `manage events` |

Both parameters are constrained to digits. **No route model binding is registered for either
name**, deliberately: an implicit binding claims the parameter name application-wide.

## Permissions

```php
Permission::register('view events')->children([
    Permission::make('manage events'),
]);
```

Two, in the `events` group. `view events` is the parent and covers the listing and the detail
screen; `manage events` covers every write.

## The facade

```php
use Goldnead\Events\Facades\Events;   // alias: Events

events(array $filters = []): Collection<int, Event>
occurrences(array $filters = []): Collection<int, Occurrence>
next(array $filters = []): ?Occurrence
feed(array $filters = []): Collection<int, Occurrence>
eventQuery(array $filters = []): Builder<Event>
occurrenceQuery(array $filters = []): Builder<Occurrence>
```

Resolves `Goldnead\Events\EventManager`. Container alias: `statamic-events`.

Filter keys: `type`, `listable`, `event`, `from`, `to`, `upcoming`, `include_cancelled`, `limit`,
`order`.

`events()` ignores `limit`. The tag trims the collection afterwards.

`next()` merges `upcoming => true`, `include_cancelled => false`, `order => 'asc'`, `limit => 1`
over the caller's filters. `feed()` merges `listable => true`, `from` from `feeds.past_days`,
`include_cancelled => true`, `order => 'asc'` and `limit` from `feeds.max_occurrences`, and those
override the caller.

`EventManager` throws nothing.

## Models

### `Models\Event`

```php
$casts = ['visibility' => Visibility::class, 'status' => EventStatus::class];
$guarded = [];

occurrences(): HasMany                 // ordered by starts_at

static defaultTimezone(): string
publish(): self
unpublish(): self
isPublished(): bool
isPubliclyReadable(): bool             // isPublished() && visibility->isAddressable()
isListable(): bool                     // isPublished() && visibility->isListable()
```

Scopes:

| Scope | Adds |
| --- | --- |
| `published()` | `status = 'published'` |
| `addressable()` | `status = 'published' and visibility != 'private'` |
| `listable()` | `status = 'published' and visibility = 'public'` |
| `ofType($type)` | `whereIn('type', (array) $type)` |

`published_at` is a UTC attribute rather than a cast.

### `Models\Occurrence`

```php
$casts = ['all_day' => 'boolean', 'status' => OccurrenceStatus::class, 'sequence' => 'integer'];
$guarded = [];

event(): BelongsTo

effectiveTimezone(): string
localStart(): CarbonImmutable
localEnd(): ?CarbonImmutable
isCancelled(): bool
isOnline(): bool
hasVenue(): bool
locationLine(): ?string
reschedule(mixed $startsAt, mixed $endsAt = null): self
cancel(?string $reason = null): self
```

Scopes:

| Scope | Adds |
| --- | --- |
| `scheduled()` | `status = 'scheduled'` |
| `upcoming($from = null)` | `starts_at >= $from ?: now()`, in UTC |
| `startsBetween($from = null, $to = null)` | Bounds `starts_at` at either end |

`starts_at`, `ends_at` and `cancelled_at` are UTC attributes rather than casts.

## Enums

```php
Goldnead\Events\Enums\EventStatus: string
    Draft = 'draft'
    Published = 'published'
    static options(): array

Goldnead\Events\Enums\OccurrenceStatus: string
    Scheduled = 'scheduled'
    Cancelled = 'cancelled'
    icsStatus(): string          // 'CONFIRMED' | 'CANCELLED'
    static options(): array

Goldnead\Events\Enums\Visibility: string
    Public = 'public'
    Unlisted = 'unlisted'
    Private = 'private'
    isAddressable(): bool        // !== Private
    isListable(): bool           // === Public
    static options(): array
```

## Events

| Event | Payload |
| --- | --- |
| `Events\EventPublished` | `readonly Event $event` |
| `Events\OccurrenceScheduled` | `readonly Occurrence $occurrence` |
| `Events\OccurrenceRescheduled` | `readonly Occurrence $occurrence`, `readonly CarbonImmutable $previousStartsAt`, `readonly ?CarbonImmutable $previousEndsAt` |
| `Events\OccurrenceCancelled` | `readonly Occurrence $occurrence`, `readonly ?string $reason` |

There is no `EventUnpublished` and no occurrence-deleted event.

## Exceptions

Both extend `RuntimeException`.

| Class | Thrown when |
| --- | --- |
| `Exceptions\UnlocatableOccurrence` | An occurrence has neither `venue_name` nor `online_url`, on create or update |
| `Exceptions\InvalidOccurrenceWindow` | `ends_at` is earlier than `starts_at`. Equal instants are allowed |

The Control Panel converts both into field errors before they are thrown. The model guards
remain the authority for every other caller.

## Schema

### `events`

| Column | Type | Null |
| --- | --- | --- |
| `id` | `bigIncrements` | no |
| `brand_id` | `unsignedBigInteger`, indexed | no |
| `uuid` | `uuid`, unique | no |
| `title` | `string(255)` | no |
| `slug` | `string(191)` | no |
| `description` | `text` | yes |
| `type` | `string(64)` | no |
| `visibility` | `string(16)` | no |
| `status` | `string(16)` | no |
| `timezone` | `string(64)` | no |
| `published_at` | `timestamp` | yes |
| `created_at`, `updated_at` | `timestamps` | yes |

Indexes: `evt_brand_slug_unique` unique `(brand_id, slug)`, `evt_brand_type_status_idx`,
`evt_brand_vis_status_idx`.

`slug` is `191` rather than `255` because a utf8mb4 `varchar(255)` costs 1020 of InnoDB's 3072
index bytes.

### `event_occurrences`

| Column | Type | Null | Default |
| --- | --- | --- | --- |
| `id` | `bigIncrements` | no | |
| `brand_id` | `unsignedBigInteger`, indexed | no | |
| `event_id` | `unsignedBigInteger` | no | |
| `uuid` | `uuid`, unique | no | |
| `starts_at` | `timestamp`, UTC | no | |
| `ends_at` | `timestamp`, UTC | yes | |
| `all_day` | `boolean` | no | `false` |
| `timezone` | `string(64)` | yes | |
| `status` | `string(16)` | no | |
| `cancelled_at` | `timestamp` | yes | |
| `cancellation_reason` | `string(255)` | yes | |
| `venue_name` | `string(191)` | yes | |
| `venue_address` | `string(255)` | yes | |
| `venue_city` | `string(191)` | yes | |
| `venue_country` | `string(2)` | yes | |
| `online_url` | `string(512)` | yes | |
| `sequence` | `unsignedInteger` | no | `0` |
| `created_at`, `updated_at` | `timestamps` | yes | |

Indexes: `evtocc_brand_event_start_idx`, `evtocc_brand_status_start_idx`. Foreign key
`evtocc_event_fk` on `event_id` to `events.id`, `ON DELETE CASCADE`.

There is no CHECK constraint for the location rule. It lives in the model.

## Antlers tags

| Tag | Parameters |
| --- | --- |
| `{{ events }}` | `type`, `limit`, `listable` |
| `{{ events:occurrences }}` | `event`, `type`, `from`, `to`, `limit`, `order`, `include_cancelled`, `listable` |
| `{{ events:upcoming }}` | The same. `include_cancelled` defaults to `false` |
| `{{ events:next }}` | The same. Cancelled dates are never returned |
| `{{ events:count }}` | The same. `limit` does not reduce the count |
| `{{ events:feed_url }}` | `type` |
| `{{ events:ics_url }}` | `occurrence` |

Shapes are in [Antlers tags](/events/tags#listing-dates).

## ICS output

Hand-written RFC 5545. `PRODID: -//gldnr.studio//statamic-events//EN`, CRLF endings, folded at 75
octets without splitting a multi-byte character.

Emitted per `VEVENT`: `UID`, `DTSTAMP`, `SEQUENCE`, `STATUS`, `SUMMARY`, `DTSTART`, `DTEND`,
`DESCRIPTION`, `LOCATION`, `URL`, `COMMENT`, `LAST-MODIFIED`.

Never emitted: `RRULE`, `RDATE`, `EXDATE`, `RECURRENCE-ID`, `VTIMEZONE`, `ATTENDEE`, `VALARM`,
`ATTACH`.

Timed dates are UTC `Z` instants. All-day dates use `VALUE=DATE` with an exclusive end.

## Commands and scheduling

**None.** No Artisan command, no scheduled task, no queue worker requirement. Nothing in this
package runs unless a request or a write triggers it.

## Publish tags

| Tag | Publishes |
| --- | --- |
| `events` | The built Control Panel bundle to `public/vendor/goldnead/statamic-events/build/` |
| `events-config` | `config/events.php` |
| `events-translations` | `lang/vendor/events` |
| `events-migrations` | `database/migrations` |

There is **no views tag**. The package ships no Blade views.

## Translations

Namespace `events`, one file per language: `events::cp.*`. Shipped in `en` and `de`.

Every string in the package is a Control Panel string. The ICS output contains no translated
text.

## Requirements

```
php                             ^8.2
goldnead/statamic-brand-context ^1.0
laravel/framework               ^12.40|^13.0
statamic/cms                    ^6.0
```

Suggested: `goldnead/statamic-activity`, `goldnead/statamic-automations`,
`goldnead/statamic-notifications`. Only the first has code in this package.

Licence: MIT.

Tested against SQLite and MySQL 8. **PostgreSQL is untested**: nothing in the package is
knowingly MySQL-only, but there is no PostgreSQL run and the index-length test compiles against
the MySQL grammar alone.
