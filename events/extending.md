# Extending

<AddonHeader />

The extension surface is four domain events, one facade and the models. There is no plugin
registry, no driver interface and no place to register a fifth visibility level.

## The four domain events

```php
use Goldnead\Events\Events\EventPublished;
use Goldnead\Events\Events\OccurrenceScheduled;
use Goldnead\Events\Events\OccurrenceRescheduled;
use Goldnead\Events\Events\OccurrenceCancelled;
```

| Event | Payload | Fired |
| --- | --- | --- |
| `EventPublished` | `Event $event` | On the transition into `published`, once per transition |
| `OccurrenceScheduled` | `Occurrence $occurrence` | On every new date |
| `OccurrenceRescheduled` | `Occurrence $occurrence`, `CarbonImmutable $previousStartsAt`, `?CarbonImmutable $previousEndsAt` | After a window actually changed |
| `OccurrenceCancelled` | `Occurrence $occurrence`, `?string $reason` | On the first cancellation only |

```php
Event::listen(OccurrenceCancelled::class, function (OccurrenceCancelled $cancelled) {
    $occurrence = $cancelled->occurrence;

    Log::info('Date called off', [
        'event' => $occurrence->event->title,
        'starts_at' => $occurrence->starts_at->toIso8601String(),
        'reason' => $cancelled->reason,
    ]);
});
```

Three absences worth knowing:

- **There is no `EventUnpublished`.** `unpublish()` emits nothing.
- **Deleting an occurrence emits nothing.** Only cancelling does.
- **A no-op reschedule emits nothing.** Moving a date to the instant it already holds returns
  early, without a save and without a sequence bump.

The last one is why a form that resubmits an unchanged date does not generate calendar churn,
and it is worth relying on rather than deduplicating downstream.

## The facade

```php
use Goldnead\Events\Facades\Events;

Events::events(array $filters = []): Collection            // of Event
Events::occurrences(array $filters = []): Collection       // of Occurrence
Events::next(array $filters = []): ?Occurrence
Events::feed(array $filters = []): Collection              // of Occurrence
Events::eventQuery(array $filters = []): Builder
Events::occurrenceQuery(array $filters = []): Builder
```

Filter keys are the ones the tags expose: `type`, `listable`, `event`, `from`, `to`, `upcoming`,
`include_cancelled`, `limit`, `order`.

```php
$next = Events::next(['event' => 'registerarbeit']);

$septemberConcerts = Events::occurrences([
    'type' => 'concert',
    'from' => '2026-09-01',
    'to' => '2026-09-30',
]);
```

The two `…Query()` methods hand back a raw Eloquent builder with the visibility clause and the
brand scope already applied, which is the right starting point for a query this package does not
offer:

```php
$countByType = Events::eventQuery(['listable' => true])
    ->selectRaw('type, count(*) as total')
    ->groupBy('type')
    ->pluck('total', 'type');
```

::: warning `feed()` overrides what you pass it
`listable`, `from` and `limit` are set from config **over** the caller's values, so a feed cannot
be widened from application code any more than it can from a URL. Use `occurrences()` if you want
control over those three.
:::

::: tip The facade resolves `EventManager::class`, not a string key
The container key `events` belongs to Laravel's event dispatcher. An addon that claimed it would
replace the dispatcher and take the framework with it. The registered alias is
`statamic-events`.

Note also that the Laravel alias `Events` is registered for this facade. If your application
already aliases something to `Events`, import the class rather than relying on the alias.
:::

## Writing through the models

The models are the write API. There is no service class in front of them.

```php
use Goldnead\Events\Models\Event;

$event = Event::create([
    'title' => 'Registerarbeit im Chor',
    'type' => 'workshop',
    'timezone' => 'Europe/Berlin',
    'visibility' => 'public',
]);

$event->occurrences()->create([
    'starts_at' => new DateTimeImmutable('2026-09-12 10:00', new DateTimeZone('Europe/Berlin')),
    'ends_at' => new DateTimeImmutable('2026-09-12 17:00', new DateTimeZone('Europe/Berlin')),
    'venue_name' => 'Musikhochschule Frankfurt',
    'venue_city' => 'Frankfurt am Main',
    'venue_country' => 'DE',
]);

$event->publish();
```

`uuid`, `slug`, `type`, `visibility`, `status` and `timezone` are all filled on create when they
are absent. The two guards, a location and an ordered window, run on create and on update.

Use `publish()` rather than setting `status` directly if you want `published_at` stamped and the
event dispatched. Setting the attribute by hand and saving does dispatch `EventPublished`,
because the hook watches the transition, but it does not stamp `published_at`.

Use `reschedule()` and `cancel()` rather than assigning the columns. Both own the sequence
counter, and the sequence is what makes a subscriber's calendar prefer the new version.

::: danger Both models are `$guarded = []`
Mass assignment is wide open on `Event` and `Occurrence`, including `brand_id`. Never pass
unfiltered request input into `create()` or `fill()`. The Control Panel maps every value
explicitly for exactly this reason, and a test asserts that no blueprint value can reach
`brand_id`.
:::

## The Activity bridge

Optional, attached with `class_exists()`, never a Composer requirement.

```php
'bridges' => [
    'activity' => true,
],
```

When [Activity](/activity/) is installed it records four fact types:

| Type | Dedupe key |
| --- | --- |
| `events.event_published` | `events.event_published:{event uuid}` |
| `events.occurrence_scheduled` | `events.occurrence_scheduled:{occurrence uuid}` |
| `events.occurrence_rescheduled` | `events.occurrence_rescheduled:{occurrence uuid}:{sequence}` |
| `events.occurrence_cancelled` | `events.occurrence_cancelled:{occurrence uuid}` |

The reschedule key carries the sequence, so each move is its own fact while a retry of the same
move is not.

`brand_id` is passed explicitly rather than left to ambient context, because the fact belongs to
the event's brand and not to whichever brand was current when a queued job ran.

The bridge swallows its own failures:

```php
try {
    Activity::record($type, [...]);
} catch (\Throwable $e) {
    report($e);
}
```

A failing ledger must not fail the write that produced the fact. This is the one deliberate
swallow in the package, and it is here rather than anywhere else because the ledger is the
optional participant.

## Automations and Notifications

**Neither has a bridge in this package.**

[Automations](/automations/) can trigger on the four domain events through Laravel's dispatcher
without anything from here, which is why `composer.json` suggests it and no code implements it.

Reminders are planned for v1.2 over [Notifications](/notifications/). There is no notifications
code, no config key and no bridge in v1. The `suggest` line describes a plan.

## What is deliberately not extensible

- **No route model binding**, for `{event}` or `{occurrence}`. An implicit binding claims the
  parameter name application-wide and would 404 a sibling addon's own `{event}` route. The
  controllers take an `int` and look the row up through the brand-scoped query instead.
- **No configurable route prefix.** A subscription URL must not be movable.
- **No fourth visibility level.** The enum is closed and every rule reads it in one place.
- **No recurrence hook.** There is no generator to extend.
- **No views to override.** The package ships no Blade at all.
