# Why it does not build a calendar

<AddonHeader />

The tempting version of this addon is a calendar: opening hours in the Control Panel, a
grid of free slots on the site, an email when someone picks one. It is the version people
ask for, and it is the version that goes wrong.

## What a calendar actually is

Four problems sit behind that grid, and none of them is small:

| Problem | Where it bites |
| --- | --- |
| **Availability** | Buffers, minimum notice, maximum bookings per day, holidays, two people who must both be free |
| **Time zones** | The visitor's, the organiser's, and the two days a year when one of them shifts and the other does not |
| **Reschedules** | A link that survives being clicked twice, in a mailbox, six weeks later |
| **Reminders** | Delivery, timing, opt-out, and what happens when the appointment moved after the reminder was queued |

Each is a product on its own. Cal.com has spent years on them. An addon that reimplements
a fraction of them ships a booking flow that works in the demo and drops an appointment in
March, and the site owner finds out when the person turns up and nobody is there.

So this addon does not compete there. **Cal.com decides. This records what it decided, and
gives your site a seam to react.**

## The division of labour

```
Cal.com                          Statamic
─────────────────────────────    ──────────────────────────────────
availability, slots, time zones
the booking page
reschedule and cancel links
reminder emails
        │
        │  signed webhook
        ▼
                                 verify (HMAC, constant time)
                                 record one row, idempotently
                                 dispatch a domain event
                                        │
                                        ▼
                                 your listeners: mail, CRM,
                                 an entry, an invoice, anything
```

Everything left of the arrow is a solved problem you rent. Everything right of it is your
site, and it is ordinary Laravel that you can test.

## What "no calendar" buys you on the page

An embed is not neutral. Cal.com's own embed loads Cal.com's script into the visitor's
browser on every page it sits on, which makes it a third party you have to declare, block
behind a consent gate and explain in a privacy policy.

A signed webhook loads nothing. The booking happens on Cal.com's domain, the result arrives
server to server, and the page carries no third-party request at all. If you have just
installed a consent banner, that is not a detail — it is one fewer service in it. (If you
do embed Cal.com anyway, [Consent](/consent/) is the addon that keeps it out of the
document until the visitor allows it.)

## Three distinctions the recording makes

The whole value of "just recording it" is that the recording is honest about what it knows.

### A requested booking is not an appointment

An event type that needs confirming produces `BOOKING_REQUESTED` first. The addon records
it, with status `requested`, and then:

- it is **excluded from `{{ bookings }}` and `{{ bookings:count }}`**
- **no event is dispatched** — telling listeners "a booking was made" would have them send
  a confirmation for an appointment the organiser may still decline

It has been asked for, not agreed. It becomes real when `BOOKING_CREATED` arrives, and it
is closed by `BOOKING_REJECTED` the same way a cancellation closes a booking.

### A cancellation is not a deletion

Cancelling stamps `cancelled_at` and sets the status to `cancelled` or `rejected`. The row
stays.

"There was an appointment and it was cancelled" is a different fact from "there never was
one", and only one of the two can be reconstructed later. Deleting the row throws away the
one that cannot.

### A redelivery is not a change

Providers retry on any non-2xx, and the order of retries is not guaranteed. Three things
follow from that, and all three are enforced rather than hoped for:

- `(endpoint, external_id)` is a **unique index**, so the database refuses a duplicate
  rather than trusting the code to check first.
- A redelivered `BOOKING_CREATED` uses `firstOrCreate`, not `updateOrCreate` — it must not
  overwrite a booking the visitor has since rescheduled.
- A `BOOKING_RESCHEDULED` that arrives **after** a cancellation does not resurrect the row.
  Reviving it would put a cancelled appointment back into `{{ bookings }}` and fire
  `BookingRescheduled` at every listener.

The consequence for you: an event from this addon almost always means something actually
changed. The one place that guarantee is thinner is a redelivered reschedule, which is named
plainly in [Reacting to a booking](/booking/events#once-per-real-change).

## What you give up

Honestly, three things:

- **You cannot show a booking form on your own page** without Cal.com's embed. The
  addon offers no slot picker and will not grow one.
- **You cannot cancel or move an appointment from Statamic.** The Control Panel screen is
  read-only, because the calendar is the authority and a button here would put the two out
  of step.
- **You depend on an external service.** If Cal.com is down, no booking is made — and no
  webhook is lost either, because Cal.com retries.

If those are unacceptable, this is the wrong addon, and the right answer is probably not a
different addon but a scheduling product.
