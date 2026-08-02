# Concepts

<AddonHeader />

Two models, two tables, and a set of rules about what may not exist.

## Events and occurrences

An **event** is the description: title, slug, type, visibility, status, timezone, brand. An
**occurrence** is one date of it: a start, an optional end, a location, and its own status.

```
events                        event_occurrences
  id                            id
  brand_id                      brand_id
  uuid                          event_id  ──▶ events.id, ON DELETE CASCADE
  title                         uuid
  slug        unique per brand  starts_at    always UTC
  description                   ends_at
  type        free string       all_day
  visibility  public/unlisted/  timezone     null = the event's zone
              private           status       scheduled/cancelled
  status      draft/published   cancelled_at
  timezone    IANA id           cancellation_reason
  published_at                  venue_name / venue_address / venue_city / venue_country
                                online_url
                                sequence     RFC 5545 SEQUENCE
```

The slug is unique per brand, not globally. Two brands may each have a `sommerkonzert`.

## Ids are never exposed

Both tables carry a `uuid` alongside the auto-increment `id`. Everything that leaves the
installation uses the UUID: the ICS `UID`, the download URL, the activity dedupe key. The
integer id appears only in Control Panel routes, behind authentication.

The UUID of an occurrence never changes, not on reschedule and not on cancellation. That is what
makes a calendar client accept an update instead of creating a second appointment.

## A date needs a place

An occurrence must have a venue name or an online URL. Both are optional on their own; having
neither leaves a date nobody can attend.

```php
Occurrence::create([
    'starts_at' => '2026-09-12 08:00:00',
    'venue_name' => 'Musikhochschule Frankfurt',
]);                                          // fine

Occurrence::create([
    'starts_at' => '2026-09-12 08:00:00',
    'online_url' => 'https://meet.example.com/registerarbeit',
]);                                          // also fine

Occurrence::create(['starts_at' => '2026-09-12 08:00:00']);
// UnlocatableOccurrence: An occurrence needs a venue name or an online URL.
```

The rule is enforced on `creating` **and** on `updating`, in the model. There is no database
CHECK constraint, because a constraint spanning two nullable columns is not portable and SQLite
would not enforce it anyway.

The Control Panel pre-empts the exception with a field error on `venue_name`, so an editor sees
a form message rather than a 500. The model guard remains the authority: anything writing
through Eloquent hits it too.

An end before its start throws `InvalidOccurrenceWindow`. Equal instants are allowed, because a
zero-length marker is a legitimate thing to record.

## Publishing

```php
$event->publish();     // status = published, stamps published_at the first time only
$event->unpublish();   // status = draft, keeps published_at
```

`published_at` records when the event was **first** published. Unpublishing and republishing
does not move it, so the field stays usable as an "in the world since" date.

`EventPublished` fires on the transition into `published`, once. Re-saving an already published
event emits nothing. There is no `EventUnpublished` event.

## Cancelling never deletes

```php
$occurrence->cancel('The venue withdrew.');
```

The row stays. `status` becomes `cancelled`, `cancelled_at` is stamped, the reason is kept, and
`sequence` rises by one. The date **keeps appearing in the calendar feed** with
`STATUS:CANCELLED`, which is how a subscriber's calendar learns that the appointment is off.

Deleting the row instead would leave the subscriber holding an appointment nobody can cancel.
The Control Panel's delete button warns about exactly that.

Cancelling twice is a no-op: no second event, no second sequence bump.

## Rescheduling

```php
$occurrence->reschedule('2026-10-04 08:00:00', '2026-10-04 15:00:00');
```

`reschedule()` sets the **whole window**. Calling it without an end **clears** an existing end;
that is not an oversight, it is the only way to remove one.

If neither `starts_at` nor `ends_at` actually changed, the call returns immediately: no save, no
sequence bump, no event. A form that submits an unchanged date does not generate calendar
churn.

Otherwise `sequence` rises, the row is saved, and `OccurrenceRescheduled` carries the previous
window alongside the new one.

The Control Panel splits its write for this reason: everything except the window goes through a
plain save, then `reschedule()` is called separately, so a moved date always travels the
sequence-bumping path.

## Brand inheritance

An occurrence created through its event inherits `brand_id` from the event, before Brand
Context's own stamping runs:

```php
static::creating(function (Occurrence $occurrence): void {
    if (empty($occurrence->brand_id) && $occurrence->event) {
        $occurrence->brand_id = $occurrence->event->brand_id;
    }
});
```

Brand Context stamps the **ambient** brand, and a console command or a queued job has none. A
date belongs to its event's brand, not to whichever brand happened to be current when the job
ran.

## There is no recurrence

No `RRULE`, no repeat field, no generator, no command. Dates are entered one at a time, through
the Control Panel, through Eloquent, or through a script you write.

The schema has been multi-date since the first migration, so a generator can be added later
without a migration. But v1 does not ship one, and the ICS output emits no `RRULE`, `RDATE`,
`EXDATE` or `RECURRENCE-ID` either.

The Control Panel makes the manual path bearable rather than automatic: a new date pre-fills the
location of the most recent existing date, so entering a ten-stop tour is ten dates rather than
ten addresses.

Nothing bounds how far ahead dates may exist. The only horizons are on the read side, in
[the feed](/events/calendar-feeds).
