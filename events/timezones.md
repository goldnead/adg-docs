# Timezones

<AddonHeader />

Instants are stored in UTC. They are displayed in the **event's** timezone, not the viewer's and
not the application's. An occurrence may override the event's zone.

## Why the event's zone and not the viewer's

A workshop in Frankfurt starts at 10:00 in Frankfurt. Rendering it as 03:00 for a reader in
Chicago is technically correct and useless: nobody travels to a 03:00 workshop, and the reader
now has to convert back to work out when to be there.

A date belongs at its place. The conversion a reader actually wants happens in their calendar
application, once they have subscribed, which is what the ICS output is for.

## The resolution order

```php
$occurrence->effectiveTimezone();
// $occurrence->timezone  ?:  $occurrence->event->timezone  ?:  Event::defaultTimezone()
```

`Event::defaultTimezone()` is `config('events.defaults.timezone')`, then `config('app.timezone')`,
then `UTC`.

The per-occurrence override is what a tour needs: one event, dates in Frankfurt, Vienna and
Zurich, each rendered in its own zone.

```php
$event = Event::create([
    'title' => 'Registerarbeit',
    'timezone' => 'Europe/Berlin',
    // …
]);

$event->occurrences()->create([
    'starts_at' => '2026-09-12 08:00:00',   // 10:00 in Berlin
    'venue_name' => 'Musikhochschule Frankfurt',
]);

$event->occurrences()->create([
    'starts_at' => '2026-10-04 07:00:00',   // 09:00 in London, which is not Berlin's 09:00
    'timezone' => 'Europe/London',
    'venue_name' => 'Barbican',
]);
```

Reading it back:

```php
$occurrence->starts_at;    // CarbonImmutable, always UTC
$occurrence->localStart(); // CarbonImmutable in effectiveTimezone()
$occurrence->localEnd();   // the same, or null
```

## How a value is read on the way in

The conversion is a single `Attribute` on the model, applied to `Event::published_at` and to
`Occurrence::starts_at`, `ends_at` and `cancelled_at`. Two rules, both deliberate:

**A `DateTimeInterface` keeps its own zone and is converted.**

```php
$occurrence->starts_at = new DateTimeImmutable('2026-09-12 10:00', new DateTimeZone('Europe/Berlin'));
// stored as 2026-09-12 08:00:00 UTC
```

That is the honest reading of "19:00 in Berlin": you said which zone you meant, so it is used.

**A bare string with no zone is read as UTC.**

```php
$occurrence->starts_at = '2026-09-12 10:00:00';
// stored as 2026-09-12 10:00:00 UTC, not as 10:00 in the app timezone
```

Guessing the application timezone here would make the same literal mean different instants on
two servers, and the difference would only surface after a deploy. If you mean a wall-clock time
in a particular zone, pass a `DateTimeInterface` or parse it yourself.

::: warning The Control Panel form is different, and has to be
Statamic's date fieldtype hands back a wall-clock string in the application timezone. The
occurrence controller therefore parses form values in `config('app.timezone')` and converts to
UTC, and renders them back the same way.

So a date typed into the Control Panel means what the application timezone says, and a date
assigned in code means UTC unless you say otherwise. Both are correct for their caller, and they
are not the same rule.
:::

## DST

Storage is an instant, so a stored date is exact across a daylight-saving boundary. Rendering
applies the zone at that instant, which is what makes an event that was entered as 10:00 in
March still read as 10:00 in November.

Nothing recalculates existing rows when a zone's rules change. The instant is what was meant;
the wall-clock rendering follows whatever the current tz database says.

## The ICS output is UTC, on purpose

Timed dates are emitted as UTC instants:

```
DTSTART:20260912T080000Z
DTEND:20260912T150000Z
```

**No `TZID` parameter and no `VTIMEZONE` component is ever emitted.** A `VTIMEZONE` block that
disagrees with the client's own timezone database shifts the appointment silently, and clients
disagree more often than they should. A `Z` instant has one reading.

The calendar application converts to the reader's zone, which is the right place for that
conversion to happen: it is the only participant that knows where the reader is.

All-day dates are the exception and use RFC 5545's date form with an **exclusive** end:

```
DTSTART;VALUE=DATE:20260912
DTEND;VALUE=DATE:20260913
```

A single all-day date on the 12th ends on the 13th. That is the specification, not an off-by-one.

The all-day boundaries are computed in the occurrence's effective zone before being formatted,
so "the 12th" means the 12th where the event is.

## What is not there

There is no per-viewer timezone, no timezone detection, and no user preference. The package
renders the event's zone and the ICS carries the instant. Everything else is the calendar
client's job.
