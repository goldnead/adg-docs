# Events

<AddonHeader />

A brand-scoped domain for dated things: workshops, masterclasses, concerts, rehearsals,
course sessions. One event carries the description, and any number of **occurrences** carry
the dates.

It exists because the same calendar had been rebuilt four times in four projects, and none of
the four was reusable. This package is the shared version: a data model, a Control Panel, seven
Antlers tags, an ICS download per date and one subscribable feed.

::: warning Not released yet
Nothing here is tagged and the package is not on Packagist. Everything below describes the
current `main`, and [Installation](/events/installation) is a path or VCS repository rather
than a `composer require`.
:::

## An event is not an entry with a date field

That is the decision the whole package rests on, so it is worth stating before anything else.

An entry per date duplicates the description once per date and leaves nothing to cancel: you
either delete the entry, and everybody who subscribed keeps a date that no longer exists, or
you keep it and it still looks like it is happening. A cancelled date has to remain a row, and
a row that remains needs an owner.

```
Event  "Chorleiter-Workshop: Registerarbeit"
  ├── Occurrence  2026-09-12 10:00 Europe/Berlin   Frankfurt, Musikhochschule
  ├── Occurrence  2026-10-04 10:00 Europe/Berlin   Leipzig, Peterskirche
  └── Occurrence  2026-11-08 10:00 Europe/Berlin   cancelled, "venue withdrew"
```

Deleting the event cascades its dates away. Cancelling a date never deletes it.

## Two orthogonal fields decide who sees it

`status` answers "is this finished?" and `visibility` answers "who may look?". They are
separate columns and neither implies the other.

| | `draft` | `published` |
| --- | --- | --- |
| `public` | Control Panel only | Listed in feeds and tags, reachable by URL |
| `unlisted` | Control Panel only | Never in a feed, reachable by anyone holding the UUID |
| `private` | Control Panel only | **Control Panel only** |

A private event never leaves the Control Panel, whatever the status. Read
[Visibility](/events/visibility) before you publish anything, because this is the only part of
the package where a wrong value is a disclosure rather than a cosmetic mistake.

## Times are stored in UTC and shown in the event's zone

Not the viewer's zone. A date belongs at its place: a workshop in Frankfurt starts at 10:00 in
Frankfurt whether the person reading the page is in Frankfurt, Lisbon or Chicago. An occurrence
may override the event's zone, which is what a tour across two countries needs.

The ICS output is the exception, and deliberately so: it emits UTC instants, because a
`VTIMEZONE` block that disagrees with the client's own timezone database moves the appointment
silently. See [Timezones](/events/timezones).

## What v1 does not do

Named rather than left to be discovered:

| Not here | Where it is going |
| --- | --- |
| RSVP, capacity, waiting lists | v1.1 |
| Reminders | v1.2, over [Notifications](/notifications/) |
| Recurrence rules | No generator. Dates are entered one at a time |
| Access gating, attendance | Not planned for the 1.x line |
| Course and community linkage | The consumers reference an event by id |

There is **no recurrence engine**. The schema has been multi-date from the first migration, so
a generator can be added later without touching it, but nothing in v1 produces a series for
you.

## Where this addon stops

| Concern | Owner |
| --- | --- |
| Recording that a date was cancelled, as a fact | [Activity](/activity/), through the optional bridge |
| Reacting to the four domain events with a workflow | [Automations](/automations/) |
| Which brand an event belongs to | [Brand Context](/brand-context/) |
| Anything to do with contacts or mail | Not this package, and not by accident |
| Counting events and dates on a screen | [Insights](/insights/what-the-family-reports#events), through three figures this package contributes |

The package emits domain events and orchestrates nothing. It has no dependency on
[LeadHub](/leadhub/), [Marketing](/marketing/) or Entitlements, because a concert calendar on
an artist's website has to install without a CRM.
