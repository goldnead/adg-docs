# Booking

<AddonHeader />

Records Cal.com bookings in Statamic: signed, idempotent, and out of your way.

An appointment is made in Cal.com. This addon receives the webhook, verifies it, writes
one row, and fires a plain Laravel event so the rest of your site can react. That is the
whole product.

<Figure
  src="booking-listing"
  alt="The Bookings listing with scheduled time, event type, attendee and status"
  caption="What Cal.com decided, recorded here. The calendar itself stays where it is good." />

## It does not build a calendar, on purpose

Availability, time zones, reschedules and reminders are a solved problem, and solving them
again badly is the usual way a booking feature goes wrong. Cal.com does that part. This
addon records what it decided, and gives your site a place to react.

What that buys you, concretely: **no third-party script on the page**. The alternative is
Cal.com's own embed, which loads Cal.com into the visitor's browser on every page it sits
on — a third party to declare, block and explain. A signed webhook loads nothing.

## What you get

- **A signed webhook endpoint per funnel.** A free consultation and a paid lesson are
  different things, so they get different handles, different secrets and usually different
  consequences.
- **HMAC-SHA256 verification** over the raw body, compared in constant time, with an
  optional signed timestamp for replay protection.
- **Idempotent recording.** The provider's own booking id is a unique key in the database,
  so a redelivery updates nothing and fires nothing.
- **Three events** — `BookingMade`, `BookingRescheduled`, `BookingCancelled` — dispatched
  when the row actually moves, so a listener hears about a change rather than about a
  delivery.
- **Two Antlers tags** that carry no personal data at all, not even the booking title.
- **A read-only Control Panel screen** under Utilities, built on core's `Listing`.
- **A retention command**, because a booking carries a name and an address.

## Three rules it will not bend

**An endpoint without a secret refuses every request.** An unverified booking webhook is an
open write endpoint, and "the site has not been configured yet" must not mean "anyone may
post here".

**A requested booking is not an appointment.** A booking that still needs confirming
arrives as `requested`. It is recorded so you can see it, and it is kept out of
`{{ bookings }}` and out of `BookingMade`. Showing it as an appointment is how a calendar
tells its owner a lie.

**A cancellation keeps the row.** `cancelled_at` is stamped and the status changes.
"There was an appointment and it was cancelled" is a different fact from "there never was
one", and only one of them can be reconstructed later.

## The shortest useful path

1. Add an endpoint to `config/statamic-booking.php` with a secret from your environment.
2. In Cal.com: **Settings → Webhooks → New**, point it at
   `https://example.com/!/statamic-booking/<handle>` with the same secret.
3. Subscribe to `BOOKING_CREATED`, `BOOKING_RESCHEDULED` and `BOOKING_CANCELLED`.
4. Make a test booking and look at **Utilities → Bookings**.

## Concepts in one table

| Term | Means |
| --- | --- |
| **Endpoint** | One configured funnel: a handle, a secret, a URL |
| **Handle** | The last URL segment, and a column on every stored row |
| **External id** | Cal.com's own id for the booking (`uid`); the idempotency key |
| **Status** | `booked`, `rescheduled`, `requested`, `cancelled` or `rejected` |
| **Upcoming** | Not cancelled, not merely requested, and still in the future |

## What it deliberately does not do

- **No availability, no scheduling UI, no reminders.** Cal.com's job.
- **No writing back.** The Control Panel screen is read-only. A cancel button here would
  put the site and the calendar out of step, with the site being the one that is wrong.
- **No personal data in templates.** The Antlers tags expose no name, no address and no
  title. The Control Panel is the only place those appear.
- **No brand scoping.** This addon does not depend on
  [Brand Context](/brand-context/), and bookings are not site-scoped either.

## Next

- [Installation](/booking/installation)
- [Configuration](/booking/configuration)
- [Why it does not build a calendar](/booking/concepts)
- [Endpoints and Cal.com setup](/booking/endpoints)
- [Reacting to a booking](/booking/events)
- [What it stores](/booking/storage)
- [Reference](/booking/reference)
- [Troubleshooting](/booking/troubleshooting)
