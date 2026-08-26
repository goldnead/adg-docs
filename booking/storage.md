# What it stores

<AddonHeader />

One table, `bookings`, one row per booking. No brand column, no site column, no soft
deletes.

## The columns

| Column | Type | Holds |
| --- | --- | --- |
| `id` | auto | |
| `endpoint` | string(64), indexed | The configured funnel the booking came through |
| `external_id` | string(191) | Cal.com's own `uid` for the booking |
| `status` | string(32) | `booked`, `rescheduled`, `requested`, `cancelled`, `rejected` |
| `scheduled_at` | timestamp, nullable, indexed | The appointment |
| `timezone` | string(64), nullable | The attendee's, as Cal.com reported it |
| `duration_minutes` | unsigned int, nullable | Derived from start and end |
| `name` | string, nullable | Who booked |
| `email` | string, nullable | Their address |
| `meeting_url` | string, nullable | The video call link, when there is one |
| `meta` | json, nullable | `title` and `event_type_id` |
| `cancelled_at` | timestamp, nullable | Stamped on cancellation or rejection |
| `created_at` / `updated_at` | timestamps | When the row was written here |

`unique(endpoint, external_id)` is the load-bearing constraint. It is what makes a
redelivered webhook idempotent, and it is enforced by the database rather than by code that
checks first.

Two shapes are deliberate. `duration_minutes` is an `unsignedInteger` and not a
`smallInteger`, because 65535 minutes is 45 days and a multi-day format would hit a SQL
error in strict mode rather than simply storing a large number. `name` and `email` are plain
columns and not a relation to a user, because a booking is made by whoever filled the form,
who need not have an account and usually does not.

## Where each value comes from

The payload Cal.com posts is mapped like this:

| Column | Payload path |
| --- | --- |
| `external_id` | `payload.uid` |
| `scheduled_at` | `payload.startTime` |
| `duration_minutes` | `payload.startTime` → `payload.endTime` |
| `timezone` | `payload.attendees.0.timeZone` |
| `name` | `payload.attendees.0.name` |
| `email` | `payload.attendees.0.email` |
| `meeting_url` | `payload.metadata.videoCallUrl` |
| `meta.title` | `payload.title` |
| `meta.event_type_id` | `payload.eventTypeId` |

The mapping lives in one class, so a second provider with a different shape is a second
mapper rather than a second endpoint.

**Without `payload.uid` nothing is written.** There is nothing to be idempotent about, and
recording it anyway would mean a redelivery creates a second booking, which is worse than
dropping one malformed call. The endpoint still answers `200 {"recorded":false}`.

**An unparseable `startTime` does not lose the booking.** `scheduled_at` stays null, and
the row is kept: a provider that sends a broken time still made an appointment, and losing
the row over the clock would be the worse trade. Those rows sort with "upcoming" in the
Control Panel filter, because they are unresolved and unresolved is what that filter is for.

## The title is the trap

Cal.com's default booking title is *"30 Min Meeting between {organiser} and {attendee}"*. It
is stored in `meta.title`, and it looks like a harmless label while carrying the booker's
name.

This is why the Antlers tags expose **no title, no name and no address**. One careless
template is all it takes to publish the people who booked, so the tag simply has nothing to
publish. Whoever needs the rest has the model, and the Control Panel screen behind a
permission.

## Reading it yourself

```php
use Goldnead\StatamicBooking\Models\Booking;

Booking::query()->upcoming()->get();                       // not cancelled, not requested, future
Booking::query()->upcoming()->forEndpoint('beratung')->get();
Booking::find($id)->isCancelled();
Booking::statuses();                                       // every status this package writes
```

`upcoming()` orders by `scheduled_at` ascending and excludes `requested` on purpose: it has
been asked for, not agreed.

`Booking::statuses()` exists so the filter, the screen and the model cannot drift apart. Use
it rather than a hand-written array if you build something on top.

## The Control Panel screen

**Utilities → Bookings**, behind the `access bookings utility` permission.

| Column | Visible by default |
| --- | --- |
| Appointment (`scheduled_at`) | yes |
| Who (`name`) | yes |
| Status | yes |
| Duration | yes |
| Endpoint | yes |
| Address (`email`) | **no** |
| Received (`created_at`) | **no** |

The address is off unless asked for. It is the most sensitive thing on the screen, and a
listing shared in a meeting or on a projector should not carry it by default. The choice is
remembered per user.

Search covers `name`, `email`, `endpoint` and `external_id`. Sorting is restricted to a
positive list — `scheduled_at`, `created_at`, `status`, `endpoint`, `name`, `email` — so a
hand-edited `sort` parameter cannot order by a column the screen deliberately hides.

Two filters ship, both real Statamic filters rather than query parameters, so they show a
badge, survive sorting and paging and can be kept as a saved view:

- **Status** — any one of the five
- **When** — upcoming or past

The screen is **read-only**. Cal.com owns these appointments, and a cancel button here
would put the site and the calendar out of step, with the site being the one that is wrong.

## Retention

A booking carries a name and an address. Keeping every one forever is the opposite of data
minimisation, so there is a command:

```bash
php please booking:prune
# or: php artisan statamic:booking:prune
```

It deletes bookings whose **appointment** is older than `keep_days` (default 730), and —
this is the part that is easy to get wrong — also rows whose `scheduled_at` is null and
whose `created_at` is older than the cutoff. A null appointment time is not "never old", and
`WHERE scheduled_at < x` skips nulls, so without that second clause exactly the rows the
addon deliberately keeps would be kept forever, against the promise the command exists to
make.

With `keep_days` set to `null` the command deletes nothing and says so, rather than
succeeding quietly.

**Nothing schedules it.** Add it to your application's scheduler:

```php
// routes/console.php
Schedule::command('statamic:booking:prune')->weekly();
```

## What is not stored

- **No IP address and no user agent.** Neither is in the payload the addon reads, and
  neither is needed.
- **No Statamic entry, no form submission, no contact.** The addon writes one row and
  dispatches an event; anything else is a listener you wrote.
- **No delivery log.** There is no record of refused or unmapped deliveries beyond the
  warning line in `laravel.log`. If you need one, put
  [Webhook Manager](/webhook-manager/) in front of the problem instead — that is the addon
  whose job is transport.

## Multi-site and multi-brand

Bookings are **not site-scoped**. A booking is an appointment with a person, not a piece of
content, and it does not become a different appointment when read from another site. There
is no brand column either; this addon does not depend on
[Brand Context](/brand-context/).

If you need per-site or per-brand separation, use one endpoint per site and filter on
`endpoint`. That keeps the separation in a column that already exists and already has an
index.
