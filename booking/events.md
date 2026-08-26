# Reacting to a booking

<AddonHeader />

The addon records the booking and then gets out of the way. What happens next — a welcome
mail, a contact in your CRM, an entry, an invoice, a message in a channel — belongs to your
site, and it reaches it as a plain Laravel event.

## Three events

```php
Goldnead\StatamicBooking\Events\BookingMade
Goldnead\StatamicBooking\Events\BookingRescheduled
Goldnead\StatamicBooking\Events\BookingCancelled
```

Each carries exactly one public property, `$booking`, which is the Eloquent model.

```php
use Goldnead\StatamicBooking\Events\BookingMade;
use Illuminate\Support\Facades\Event;

Event::listen(BookingMade::class, function (BookingMade $event) {
    $event->booking->email;            // who booked
    $event->booking->name;
    $event->booking->scheduled_at;     // Carbon, or null
    $event->booking->timezone;         // the attendee's, as Cal.com reported it
    $event->booking->duration_minutes;
    $event->booking->endpoint;         // which funnel
    $event->booking->meeting_url;
});
```

In a real application these belong in a listener class registered the normal Laravel way,
and they can be queued like any other listener. The addon does not queue anything itself:
it dispatches synchronously inside the webhook request, so a slow listener is a slow webhook
response and eventually a Cal.com retry. Queue anything that talks to a third party.

## Once per real change

The recorder dispatches when the row actually moves, so **a listener can largely assume it
is being told something new.** Providers retry on any non-2xx and a proxy can duplicate a
request nobody retried, so this matters more than it sounds.

| What arrives | Event |
| --- | --- |
| First `BOOKING_CREATED` | `BookingMade` |
| The same `BOOKING_CREATED` again | none |
| `BOOKING_RESCHEDULED` for a known booking | `BookingRescheduled` |
| The same `BOOKING_RESCHEDULED` again | `BookingRescheduled` — **again**, see below |
| `BOOKING_RESCHEDULED` for a booking that was never created | `BookingMade` |
| `BOOKING_RESCHEDULED` after a cancellation | none |
| `BOOKING_CANCELLED` | `BookingCancelled` |
| `BOOKING_CANCELLED` for an already cancelled booking | none |
| `BOOKING_REJECTED` | `BookingCancelled` |
| `BOOKING_REQUESTED` | none |

::: warning `BookingRescheduled` is the exception
Creation and cancellation are guarded against a redelivery by state that already exists:
the unique key refuses a second insert, and an already-cancelled row returns early. A
reschedule has no such marker — the recorder writes the times it was given and dispatches,
whether or not they differ from what was already there. **A redelivered
`BOOKING_RESCHEDULED` therefore fires `BookingRescheduled` a second time.**

If your listener does something a person notices — sends mail, moves an invoice — compare
against the row before acting, or key the side effect on the new appointment time:

```php
Event::listen(BookingRescheduled::class, function (BookingRescheduled $event) {
    if (! $event->booking->wasChanged('scheduled_at')) {
        return;
    }
    // …
});
```

`wasChanged()` is accurate here because the model was saved in this same request.
:::

Two more rows in that table deserve a sentence each.

**A reschedule for a booking that was never created dispatches `BookingMade`.** The create
webhook can be lost — a deploy, a 500, a subscription added after the fact — and the
visitor still has an appointment. The row is inserted with `createOrFirst` so two
simultaneous deliveries cannot both insert it, and the listener is told what actually
happened from the site's point of view: this booking is new here.

**A reschedule after a cancellation dispatches nothing and changes nothing.** Providers
retry on any non-2xx and the order is not guaranteed, so this sequence is ordinary rather
than exotic. Reviving the row would put a cancelled appointment back into `{{ bookings }}`
and fire `BookingRescheduled` at every listener.

## `requested` is deliberately silent

A booking on a confirmation-required event type arrives as `BOOKING_REQUESTED` and is
recorded with status `requested`. **No event is dispatched.**

Nothing has been agreed yet. Telling listeners "a booking was made" would have them send a
confirmation for an appointment the organiser may still decline. The event you want fires
when the organiser confirms and `BOOKING_CREATED` arrives.

If you *do* want to react to the request itself — to notify the organiser that something is
waiting — watch the model rather than the addon:

```php
use Goldnead\StatamicBooking\Models\Booking;

Booking::created(function (Booking $booking) {
    if ($booking->status === Booking::STATUS_REQUESTED) {
        // yours
    }
});
```

That is an explicit choice to treat a request as a thing worth acting on, made in your
application, which is where it belongs.

## `BookingCancelled` covers two different facts

Both a visitor cancelling and an organiser declining dispatch `BookingCancelled`. They are
distinguishable on the model:

```php
Event::listen(BookingCancelled::class, function (BookingCancelled $event) {
    match ($event->booking->status) {
        'rejected' => /* the organiser declined a request */,
        'cancelled' => /* the appointment was cancelled */,
    };
});
```

One event because the consequence is usually the same — the slot is not happening — and two
statuses because the reason is not, and only the row remembers it.

## Wiring it to the rest of the suite

There is no built-in bridge, and none is needed: these are ordinary Laravel events, so any
addon that listens to events can consume them.

- **[LeadHub](/leadhub/)** — `LeadHub::ingest()` turns any source into a contact and a
  timeline entry, deduplicated and idempotent. A `BookingMade` listener calling it is about
  five lines, and it is exactly the case the
  [Ingestion API](/leadhub/ingestion) exists for.
- **[Webhook Manager](/webhook-manager/)** — register a custom event trigger to forward a
  booking outward with retries, a delivery log and a replay button. See
  [Extending](/webhook-manager/extending).
- **[Activity](/activity/)** — record the booking as a fact in the ledger if you want
  cross-domain questions answered later.

Each of those is a listener you write, on purpose. The addon has no opinion about which of
them your site runs, and adding a hard dependency on any of them would make a $49 booking
recorder require a CRM.

## Failure semantics

The webhook controller does **not** wrap listeners in a try/catch. A listener that throws
turns the delivery into a 500, which Cal.com retries.

That cuts both ways, and it is worth deciding deliberately:

- The row is already written by then, so the booking is not lost.
- The retry re-enters the recorder, finds nothing changed, and dispatches **nothing** — so
  a listener that failed the first time is not tried again by the retry.

The rule that follows: **do the fragile work in a queued listener.** Then the delivery
answers 200, the job retries on its own terms, and a third-party outage never turns into a
webhook that Cal.com keeps replaying.
