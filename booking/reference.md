# Reference

<AddonHeader />

## Route

| | |
| --- | --- |
| Method and path | `POST /!/statamic-booking/{endpoint}` |
| Route name | `statamic-booking.webhook` |
| Handle pattern | `[A-Za-z0-9_-]+` |
| Middleware | `throttle:statamic-booking` only |
| CSRF | removed — four class names, see [Endpoints](/booking/endpoints#why-the-route-drops-csrf) |

## Responses

| Code | When | Body |
| --- | --- | --- |
| `200` | The signature held | `{"recorded": true}` or `{"recorded": false}` |
| `401` | Any verification failure | `{"message": "Unauthorized."}` |
| `404` | The handle is not in `endpoints` | `{"message": "Unknown endpoint."}` |
| `429` | Over `rate_limit` for this IP | Laravel's throttle response |

`{"recorded": false}` means the signature was valid and nothing was written: an unmapped
trigger, or a payload with no `payload.uid`. That is a healthy answer, not a failure — a
trigger this addon does not handle is not an error on the provider's side, and answering
anything else makes it retry forever.

## Refusal reasons

All of these answer the same 401. The reason is written to `laravel.log` as
`[statamic-booking] refused a delivery on [<handle>]: <reason>`.

| Reason | Means |
| --- | --- |
| `no secret configured for this endpoint` | The endpoint exists but its `secret` is empty |
| `missing signature header` | The configured header was not sent |
| `unknown signature algorithm [x]` | `signature.algorithm` is not a `hash_hmac` algorithm |
| `missing or unreadable timestamp` | `signature.timestamp_header` is set, the header is absent or not numeric |
| `timestamp outside tolerance` | Older or newer than `signature.tolerance_seconds` |
| `signature does not match` | The HMAC over the raw body does not match |

## Triggers

| Cal.com trigger | Effect | Event |
| --- | --- | --- |
| `BOOKING_CREATED` | Insert with status `booked` | `BookingMade`, on first insert only |
| `BOOKING_REQUESTED` | Insert with status `requested` | none |
| `BOOKING_RESCHEDULED` | Update times, status `rescheduled` | `BookingRescheduled` |
| `BOOKING_CANCELLED` | Stamp `cancelled_at`, status `cancelled` | `BookingCancelled`, unless already cancelled |
| `BOOKING_REJECTED` | Stamp `cancelled_at`, status `rejected` | `BookingCancelled`, unless already cancelled |
| anything else | ignored | none |

A `BOOKING_RESCHEDULED` for a booking that does not exist inserts it and dispatches
`BookingMade`. A `BOOKING_RESCHEDULED` after a cancellation does nothing at all.

## Payload mapping

| Column | Payload path |
| --- | --- |
| `external_id` | `payload.uid` (required) |
| `scheduled_at` | `payload.startTime` |
| `duration_minutes` | `payload.startTime` → `payload.endTime` |
| `timezone` | `payload.attendees.0.timeZone` |
| `name` | `payload.attendees.0.name` |
| `email` | `payload.attendees.0.email` |
| `meeting_url` | `payload.metadata.videoCallUrl` |
| `meta.title` | `payload.title` |
| `meta.event_type_id` | `payload.eventTypeId` |

The trigger itself is read from `triggerEvent` at the top level.

## Events

| Class | Property |
| --- | --- |
| `Goldnead\StatamicBooking\Events\BookingMade` | `public readonly Booking $booking` |
| `Goldnead\StatamicBooking\Events\BookingRescheduled` | `public readonly Booking $booking` |
| `Goldnead\StatamicBooking\Events\BookingCancelled` | `public readonly Booking $booking` |

Dispatched synchronously, inside the webhook request. See
[Reacting to a booking](/booking/events).

## Statuses

| Constant | Value | Means |
| --- | --- | --- |
| `Booking::STATUS_BOOKED` | `booked` | Agreed |
| `Booking::STATUS_RESCHEDULED` | `rescheduled` | Agreed, and moved at least once |
| `Booking::STATUS_REQUESTED` | `requested` | Asked for, not yet agreed. Not upcoming |
| `Booking::STATUS_CANCELLED` | `cancelled` | Called off |
| `Booking::STATUS_REJECTED` | `rejected` | Declined by the organiser |

`Booking::statuses()` returns all five.

## Model

`Goldnead\StatamicBooking\Models\Booking`, table `bookings`.

| Member | |
| --- | --- |
| `scopeUpcoming()` | Not cancelled, not `requested`, `scheduled_at >= now`, ordered ascending |
| `scopeForEndpoint(string $endpoint)` | Filter by handle |
| `isCancelled()` | `cancelled_at !== null` |
| `statuses()` | Static; every status this package writes |

Casts: `scheduled_at` and `cancelled_at` to `datetime`, `meta` to `array`,
`duration_minutes` to `integer`.

## Antlers tags

| Tag | Parameters | Yields |
| --- | --- | --- |
| `{{ bookings }}` | `endpoint`, `limit` (default 10) | Upcoming bookings, soonest first |
| `{{ bookings:count }}` | `endpoint` | An integer |

Each row of `{{ bookings }}` carries exactly six values:

`id`, `endpoint`, `scheduled_at`, `timezone`, `duration_minutes`, `status`.

**No name, no address, no title.** See
[What it stores](/booking/storage#the-title-is-the-trap).

```antlers
{{ bookings endpoint="beratung" limit="3" }}
    {{ if no_results }}
        <li>No appointments listed at the moment.</li>
    {{ else }}
        <li>{{ scheduled_at format="d.m.Y H:i" }} — {{ duration_minutes }} min</li>
    {{ /if }}
{{ /bookings }}
```

Like every Statamic tag pair, an empty result still parses the block once with `no_results`
set, so a template that prints a row unconditionally prints one empty row. Use the
`no_results` form above.

## Console commands

| Command | Purpose |
| --- | --- |
| `statamic:booking:prune` | Delete bookings older than `keep_days` |

Available as `php please booking:prune` — `please` drops the `statamic:` prefix — or
`php artisan statamic:booking:prune`.

**Nothing is scheduled by the addon.** If you want retention to happen, schedule it.

## Permissions

| Permission | Grants |
| --- | --- |
| `access bookings utility` | The Utilities → Bookings screen |

Registered by core along with the utility, and enforced twice: as `can:` middleware on the
route, and again in the controller through the Gate.

## Database

Table `bookings`. Columns and their meaning: [What it stores](/booking/storage#the-columns).

| Index | |
| --- | --- |
| `unique(endpoint, external_id)` | The idempotency key |
| `index(endpoint)` | |
| `index(scheduled_at)` | |

No brand column, no site column, no soft deletes.

## Configuration

```php
'endpoints' => [],
'signature' => [
    'header' => 'X-Cal-Signature-256',
    'algorithm' => 'sha256',
    'timestamp_header' => null,
    'tolerance_seconds' => 300,
],
'rate_limit' => 60,
'keep_days' => 730,
```

Full commentary: [Configuration](/booking/configuration).

## Publish tags

| Tag | Publishes |
| --- | --- |
| `statamic-booking-config` | `config/statamic-booking.php` |
| `statamic-booking-migrations` | the migration |
| `statamic-booking` | the built Control Panel bundle to `public/vendor/statamic-booking` |

The last one runs automatically when the addon is installed. Re-run it with `--force` after
an update if the screen looks stale.

## Requirements

<Requirements
  laravel="12.x / 13.x"
  database="MySQL or SQLite — required" />

A Cal.com account, on any plan that sends webhooks. No queue and no scheduler are required
by the addon itself; both become required by whatever you do in a listener, and by
retention.

`statamic/cms` `^6.0` is the only Composer dependency. Node is needed only if you rebuild
the Control Panel bundle from a clone.

## Guarantees

| | |
| --- | --- |
| Verification | HMAC over the raw body, constant-time comparison, before anything is written |
| Fail-closed | An endpoint without a secret refuses every request |
| Idempotency | `unique(endpoint, external_id)`, enforced by the database |
| `BookingMade` | Once per booking, whether it arrived as a create or as a reschedule |
| `BookingCancelled` | Once per booking; a second cancellation is silent |
| `BookingRescheduled` | Once per delivery, **not** once per change — see [Reacting to a booking](/booking/events#once-per-real-change) |
| Cancellation | Keeps the row and stamps `cancelled_at`; never deletes |
| `requested` | Recorded, excluded from `upcoming()`, dispatches nothing |
| Antlers tags | Carry no name, address or title, ever |
| Scoping | Not site-scoped, not brand-scoped |
