# Troubleshooting

<AddonHeader />

## The ICS link in the Control Panel returns 404

The Control Panel prints an `ics_url` for **every** date, including dates of private and draft
events. The public route refuses those. Check the event's status and visibility.

This is not a bug: the Control Panel is an authenticated context and the public route is not. A
link that works in one does not imply it works in the other.

## An event does not appear on the front end

Three things, in order:

1. **Is it published?** `status` must be `published`. Visibility alone does nothing.
2. **Is it public?** `{{ events }}` lists public events only. An unlisted event needs
   `listable="false"`. A private event never appears, whatever the parameter.
3. **Is it the right brand?** Every query is brand-scoped.

The README's prose sentence describing `{{ events }}` as "published and non-private only" is
wrong; the parameter table below it is right. See
[Visibility](/events/visibility#in-templates).

## An unlisted event is missing from the calendar feed

Correct behaviour. The feed is **listable only**, meaning published and public, and
`EventManager::feed()` overrides whatever the caller passed for `listable`. There is no parameter
that adds unlisted events to a feed.

Hand out the per-date ICS URL instead. That one serves unlisted events to anyone holding the
UUID.

## `{{ events:count limit="3" }}` returns more than three

`limit` is accepted and applied to the query, but a `LIMIT` clause does not reduce a `count(*)`
aggregate. The count is the full number of matching dates.

Use `limit` on the listing tags. Leave it off the count.

## `UnlocatableOccurrence` from a script or a seeder

An occurrence needs `venue_name` or `online_url`. The Control Panel turns this into a field error
before the model sees it; every other caller gets the exception.

```php
$event->occurrences()->create([
    'starts_at' => '2026-09-12 08:00:00',
    'venue_name' => 'Musikhochschule Frankfurt',   // or online_url
]);
```

## `InvalidOccurrenceWindow` on a date that looks fine

`ends_at` is earlier than `starts_at` **after conversion to UTC**. If you assigned bare strings,
both were read as UTC; if you assigned a `DateTimeInterface`, each kept its own zone. Mixing the
two is the usual cause.

```php
// Both UTC, comparable
'starts_at' => '2026-09-12 08:00:00',
'ends_at' => '2026-09-12 15:00:00',

// Both Berlin, comparable
'starts_at' => new DateTimeImmutable('2026-09-12 10:00', new DateTimeZone('Europe/Berlin')),
'ends_at' => new DateTimeImmutable('2026-09-12 17:00', new DateTimeZone('Europe/Berlin')),
```

Equal instants are allowed.

## A date is three hours off

Almost always the difference between the two reading rules. A bare string with no zone is read as
**UTC**, not as the application timezone; a `DateTimeInterface` keeps its own zone and is
converted. See [Timezones](/events/timezones#how-a-value-is-read-on-the-way-in).

Values typed into the Control Panel are different again: Statamic's date fieldtype hands back a
wall-clock string, so the controller parses it in `config('app.timezone')`. A date entered
through the form and a date assigned in code do not follow the same rule, and both are correct
for their caller.

## A subscriber's calendar shows the old time after a reschedule

Check that the write went through `reschedule()`. Assigning `starts_at` and saving does move the
date, but it does not raise `sequence`, and a calendar client that already holds the appointment
prefers the version with the higher sequence.

```php
$occurrence->reschedule('2026-10-04 08:00:00', '2026-10-04 15:00:00');
```

The Control Panel splits its write for this reason.

Also worth checking: clients refetch a subscribed feed on their own schedule, which for some is
measured in hours. `feeds.cache_seconds` bounds only the HTTP cache.

## A cancelled date still appears in the feed

Intended. It appears with `STATUS:CANCELLED` and a raised sequence, which is how a subscriber's
calendar learns the appointment is off. Removing the row would leave every subscriber holding an
appointment nobody will ever contradict.

If you genuinely want it gone, delete the occurrence. The Control Panel warns that subscribers
keep the date.

## The Control Panel nav entry is missing

Either the user lacks `view events`, or `events.cp.enabled` is `false`. With the kill switch off
the routes are not registered either, so the screens are not reachable by URL.

## `route:list` shows no `statamic.cp.events.*` routes

Same cause: `events.cp.enabled` is `false`, and `routes/cp.php` returns before registering
anything.

If the route cache is stale, `php artisan route:clear` and look again. The kill switch is read at
boot and freezes into a cached route table.

## A sibling addon's `{event}` route started 404ing

Not this package. It registers **no** route model binding for `{event}` or `{occurrence}`, and a
test asserts that eleven generic parameter names still reach a stand-in sibling untouched.

Look for an implicit binding registered in your application or in another addon: it claims the
parameter name application-wide.

## Deleting an event deleted all its dates

`ON DELETE CASCADE` on `event_occurrences.event_id`. That is the intended behaviour, and it is
why cancelling exists as a separate operation.

On SQLite the cascade only fires where foreign key enforcement is switched on. If you are seeing
orphaned occurrences on SQLite, that is the reason.

## Activity records nothing

Three conditions, all required: `goldnead/statamic-activity` is installed,
`events.bridges.activity` is not `false`, and the bridge attached.

The bridge swallows its own errors and reports them, so a failing ledger never fails the write
that produced the fact. Look in your error reporting rather than at the response.

A declined bridge does not latch, so flipping the config and re-booting is enough; you do not
need to clear anything.

## The Control Panel bundle is stale after an upgrade

```bash
php artisan vendor:publish --tag=events --force
```

The bundle is a built asset committed to the package and published to
`public/vendor/goldnead/statamic-events/build/`.
