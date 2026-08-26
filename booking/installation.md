# Installation

<AddonHeader />

<Requirements laravel="12.x / 13.x" database="MySQL or SQLite — required, the table is the addon" />

A Cal.com account is required too. The free plan sends webhooks, which is all this addon
needs.

```bash
composer require goldnead/statamic-booking
php artisan migrate
php please vendor:publish --tag=statamic-booking-config
```

**No front-end build step.** The Control Panel screen ships as a committed bundle under
`dist/`, and Statamic publishes it to `public/vendor/statamic-booking` automatically on
install. To republish it by hand after an update:

```bash
php artisan vendor:publish --tag=statamic-booking --force
```

## The migration is not optional

Unlike a feature you can leave off, the table **is** the addon. There is nothing this
package does without it, so the migrations load unconditionally and `php artisan migrate`
is part of installing it.

To keep the migration in your own repository instead:

```bash
php please vendor:publish --tag=statamic-booking-migrations
```

## Dependencies

Only `statamic/cms` `^6.0` and PHP `^8.2`. Nothing else in the suite is required, and
nothing else is pulled in — this addon has no Brand Context dependency, no queue, no
scheduler and no Node toolchain.

## Quick start

### 1. Define an endpoint

One entry per booking funnel:

```php
// config/statamic-booking.php
'endpoints' => [
    'beratung' => [
        'secret' => env('BOOKING_SECRET_BERATUNG'),
        'label' => 'Free first conversation',
    ],
],
```

```dotenv
BOOKING_SECRET_BERATUNG=a-long-random-string
```

::: warning An endpoint with no secret refuses everything
That is deliberate, and it is the single most common "nothing arrives" cause on a fresh
install. See [Endpoints](/booking/endpoints#the-secret-is-not-optional).
:::

### 2. Point Cal.com at it

**Settings → Webhooks → New** in Cal.com:

| Field | Value |
| --- | --- |
| Subscriber URL | `https://example.com/!/statamic-booking/beratung` |
| Secret | the same value as `BOOKING_SECRET_BERATUNG` |
| Triggers | `BOOKING_CREATED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED` |

If the event type needs confirming, add `BOOKING_REQUESTED` and `BOOKING_REJECTED` as
well. Without them a booking that is still awaiting confirmation never reaches your site,
and one the organiser declines stays on `booked` forever.

### 3. Book something

Make a real booking through Cal.com and open **Utilities → Bookings**. It should be there,
with a status, a time and the endpoint it came through.

## Permissions

The Control Panel screen is registered as a Statamic **utility**, so core registers the
permission along with it: `access bookings utility`, in Statamic's own permission list under
Utilities. Grant it to whoever should see names and addresses — that screen is the only
place they appear.

More than one Control Panel user requires **Statamic Pro**:

```dotenv
STATAMIC_PRO_ENABLED=true
```

## Retention

A booking carries a name and an address, so decide how long you keep them before you go
live. The default is 730 days.

```bash
php please booking:prune
```

Nothing schedules this for you. Add it to your own scheduler if you want it to happen
without being asked. See [What it stores](/booking/storage#retention).

## Licence

Commercial, one edition. See [Licensing](/guide/licensing).
